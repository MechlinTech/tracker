# Set variables for production container and image tag
$prodContainer = "Timetracker-prod"
$prodImage = "tech120/time-tracker-image:prod"  # Pulling directly from the image registry
$prodImageTag = "time-tracker-image-prod"

# Pull the production image from the registry
Write-Host "Pulling production image from the registry..."
docker pull $prodImage

# Stop and remove the existing production container (if it exists)
Write-Host "Stopping and removing existing production container..."
if (docker ps -a --filter "name=$prodContainer" | Select-String $prodContainer) {
    docker stop $prodContainer
    docker rm $prodContainer
}

# Run the production container with a restart policy
Write-Host "Running the production container..."
docker run -d -p 5800:5173 --name $prodContainer --restart always $prodImage

Write-Host "Production deployment complete!"