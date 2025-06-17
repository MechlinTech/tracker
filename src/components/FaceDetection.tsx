import React, { useEffect, useState } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

interface FaceDetectionProps {
  imageUrl: string; // URL from Supabase or public image
  onFaceDetected: (hasFace: boolean) => void;
}

export default function FaceDetection({ imageUrl, onFaceDetected }: FaceDetectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasFace, setHasFace] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let detector: faceLandmarksDetection.FaceLandmarksDetector | null = null;

    const detectFace = async () => {
      try {
        setIsLoading(true);

        // Force backend to WebGL
        await tf.setBackend('webgl');
        await tf.ready();

        // Load the model with 'tfjs' runtime
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
          runtime: 'tfjs',
          refineLandmarks: true,
          maxFaces: 1,
        };
        detector = await faceLandmarksDetection.createDetector(model, detectorConfig);

        // Load image
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = async () => {
          if (!isMounted) return;

          try {
            const predictions = await detector!.estimateFaces(img);
            const foundFace = predictions.length > 0;

            if (isMounted) {
              setHasFace(foundFace);
              onFaceDetected(foundFace);
              setIsLoading(false);
            }
          } catch (err) {
            if (isMounted) {
              setHasFace(false);
              onFaceDetected(false);
              setIsLoading(false);
            }
          }
        };

        img.onerror = (e) => {
          if (isMounted) {
            setHasFace(false);
            onFaceDetected(false);
            setIsLoading(false);
          }
        };

        img.src = imageUrl;
      } catch (error) {
        if (isMounted) {
          setHasFace(false);
          onFaceDetected(false);
          setIsLoading(false);
        }
      }
    };

    detectFace();

    return () => {
      isMounted = false;
      if (detector) {
        detector.dispose();
      }
    };
  }, [imageUrl, onFaceDetected]);

  return (
    <div className="text-sm font-medium">
      {isLoading ? (
        <span className="text-gray-500">Analyzing image...</span>
      ) : (
        <span className={hasFace ? 'text-green-600' : 'text-red-600'}>
          {hasFace ? 'Face detected' : 'No face detected'}
        </span>
      )}
    </div>
  );
}
