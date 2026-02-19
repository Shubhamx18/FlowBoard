def call(String imageName, String imageTag, String dockerHubUser) {
    sh """
        sudo usermod -aG docker jenkins
        sudo reboot
        sudo su - jenkins
        docker ps
        docker build -t ${dockerHubUser}/${imageName}:${imageTag} .
    """
}
