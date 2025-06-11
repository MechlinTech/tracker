# Set variables for development container and image tag
$devContainer = "Timetracker-dev"
$devImage = "tech120/time-tracker-image:dev"
$devImageTag = "time-tracker-image-dev"

# DEBUG: Check if environment variables are present
Write-Host "Supabase Anon Key: $env:VITE_SUPABASE_ANON_KEY"
Write-Host "Supabase URL: $env:VITE_SUPABASE_URL"

# Create .env file using values from Azure DevOps environment variables
Write-Host "Creating .env file with environment variables..."
@"
VITE_SUPABASE_ANON_KEY=$($env:VITE_SUPABASE_ANON_KEY)
VITE_SUPABASE_URL=$($env:VITE_SUPABASE_URL)
"@ | Out-File -Encoding ascii .env

# DEBUG: Show .env file contents (optional, remove in production)
Write-Host "Contents of .env file:"
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
 