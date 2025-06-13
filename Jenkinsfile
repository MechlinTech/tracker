pipeline {
    agent any

    environment {
        DOCKER_HUB_CREDENTIALS = credentials('dockerhub-creds') // Stored Jenkins credentials ID
        IMAGE_NAME = "tech120/time-tracker-image"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Set Tag') {
            steps {
                script {
                    // Extract branch name properly
                    def branch = env.GIT_BRANCH?.replaceFirst(/^origin\//, '')

                    if (branch == 'main') {
                        env.DOCKER_TAG = "dev"
                    } else if (branch == 'production') {
                        env.DOCKER_TAG = "prod"
                    } else {
                        error "Unsupported branch: ${branch}"
                    }

                    echo "Branch: ${branch}, Docker Tag: ${env.DOCKER_TAG}"
                }
            }
        }

        stage('Docker Login') {
            steps {
                script {
                    sh "echo ${DOCKER_HUB_CREDENTIALS_PSW} | docker login -u ${DOCKER_HUB_CREDENTIALS_USR} --password-stdin"
                }
            }
        }

        stage('Docker Build & Push') {
            steps {
                sh """
                    docker build -t ${IMAGE_NAME}:${DOCKER_TAG} .
                    docker push ${IMAGE_NAME}:${DOCKER_TAG}
                """
            }
        }
    }

    post {
        failure {
            echo 'Build failed!'
        }
        success {
            echo 'Build and push successful.'
        }
    }
}
