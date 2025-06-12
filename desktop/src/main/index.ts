import { app, BrowserWindow, Tray, Menu, dialog, systemPreferences } from 'electron';
import { createClient } from '@supabase/supabase-js';
import Store from 'electron-store';
import schedule from 'node-schedule';
import path from 'path';
import { desktopCapturer } from 'electron';

const store = new Store();
let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let isTracking = false;
let currentTimeEntry: any = null;
let screenshotJob: schedule.Job | null = null;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkPermissions() {
  if (process.platform === 'win32') {
    return true; // Windows doesn't require explicit screen capture permission
  }
  return true;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  await mainWindow.loadFile(path.join(__dirname, '../renderer/login.html'));

  mainWindow.on('close', (e) => {
    if (isTracking) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

async function setupTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  tray = new Tray(iconPath);
  updateTrayMenu();
}

async function captureScreenshot() {
  if (!currentTimeEntry) return;

  try {
    const hasPermissions = await checkPermissions();
    if (!hasPermissions) {
      throw new Error('Missing required permissions');
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail.toJPEG(90);
      const timestamp = new Date().toISOString();
      const screenPath = `${currentTimeEntry.user_id}/${currentTimeEntry.id}/screen_${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(screenPath, screenshot);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('screenshots')
        .insert({
          time_entry_id: currentTimeEntry.id,
          storage_path: screenPath,
          type: 'screen',
          taken_at: timestamp
        });

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    dialog.showErrorBox('Screenshot Error', 'Failed to capture or upload screenshot');
  }
}

async function startTracking() {
  try {
    const hasPermissions = await checkPermissions();
    if (!hasPermissions) {
      throw new Error('Required permissions not granted');
    }

    const userId = store.get('userId');
    if (!userId) {
      throw new Error('User not logged in');
    }

    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        start_time: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    currentTimeEntry = entry;
    isTracking = true;
    updateTrayMenu();

    await captureScreenshot();

    screenshotJob = schedule.scheduleJob('*/5 * * * *', captureScreenshot);

    new Notification({
      title: 'Time Tracking Started',
      body: 'Screenshots will be captured every 5 minutes'
    }).show();

  } catch (error) {
    console.error('Error starting tracking:', error);
    dialog.showErrorBox('Error', 
      error instanceof Error 
        ? error.message 
        : 'Failed to start tracking'
    );
  }
}

async function stopTracking() {
  if (!currentTimeEntry) return;

  try {
    const { error } = await supabase
      .from('time_entries')
      .update({ end_time: new Date().toISOString() })
      .eq('id', currentTimeEntry.id);

    if (error) throw error;

    if (screenshotJob) {
      screenshotJob.cancel();
      screenshotJob = null;
    }

    currentTimeEntry = null;
    isTracking = false;
    updateTrayMenu();

    new Notification({
      title: 'Time Tracking Stopped',
      body: 'Time tracking session has ended'
    }).show();

  } catch (error) {
    console.error('Error stopping tracking:', error);
    dialog.showErrorBox('Error', 'Failed to stop tracking');
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isTracking ? 'Stop Tracking' : 'Start Tracking',
      click: () => isTracking ? stopTracking() : startTracking()
    },
    { type: 'separator' },
    {
      label: 'Take Screenshot Now',
      click: captureScreenshot,
      enabled: isTracking
    },
    {
      label: 'Settings',
      click: () => mainWindow?.show()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: async () => {
        if (isTracking) {
          const { response } = await dialog.showMessageBox({
            type: 'question',
            buttons: ['Stop Tracking & Quit', 'Cancel'],
            title: 'Confirm Quit',
            message: 'Time tracking is active. Do you want to stop tracking and quit?'
          });
          if (response === 0) {
            await stopTracking();
            app.quit();
          }
        } else {
          app.quit();
        }
      }
    }
  ]);

  tray.setToolTip(`TimeTracker - ${isTracking ? 'Recording' : 'Stopped'}`);
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(async () => {
  await createWindow();
  await setupTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});