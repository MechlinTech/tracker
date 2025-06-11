# Set variables for development container and image tag
$devContainer = "Timetracker-dev"
$devImage = "tech120/time-tracker-image:dev"
$devImageTag = "time-tracker-image-dev"

# Create .env file with Azure DevOps variables
Write-Host "Creating .env file with Azure DevOps variables..."
@"
VITE_SUPABASE_ANON_KEY=$($env:VITE_SUPABASE_ANON_KEY)
VITE_SUPABASE_URL=$($env:VITE_SUPABASE_URL)
"@ | Out-File -Encoding ascii .env

# Display .env for debugging (optional, comment out in production)
Get-Content .env

# Pull the development image from the registry
Write-Host "Pulling development image from the registry..."
docker pull $devImage

# Stop and remove the existing development container (if it exists)
Write-Host "Stopping and removing existing development container..."
if (docker ps -a --filter "name=$devContainer" | Select-String $devContainer) {
    docker stop $devContainer
    docker rm $devContainer
}

# Run the development container with the .env file
Write-Host "Running the development container..."
docker run -d -p 5500:5173 `
    --name $devContainer `
    --env-file .env `
    --restart always `
    $devImage

Write-Host "Development deployment complete!"
 