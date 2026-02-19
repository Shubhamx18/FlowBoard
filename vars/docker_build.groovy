def call(String imageName, String imageTag, String dockerHubUser) {
    sh """
        sudo usermod -aG docker && newgrp docker
        sudo reboot
        sudo su - ubuntu
        docker ps
        docker build -t ${dockerHubUser}/${imageName}:${imageTag} .
    """
}
