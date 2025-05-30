# Set variables for development container and image tag
$devContainer = "Timetracker-dev"
$devImage = "tech120/time-tracker-image:dev"    # You may need to pull this or build it as well
$devImageTag = "time-tracker-image-dev"

# Pull the development image from the registry
Write-Host "Pulling development image from the registry..."
docker pull $devImage

# Stop and remove the existing development container (if it exists)
Write-Host "Stopping and removing existing development container..."
if (docker ps -a --filter "name=$devContainer" | Select-String $devContainer) {
    docker stop $devContainer
    docker rm $devContainer
}

# Run the development container
Write-Host "Running the development container..."
docker run -d -p 5500:5173 --name $devContainer $devImage

Write-Host "Development deployment complete!"
