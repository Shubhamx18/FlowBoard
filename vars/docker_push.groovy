def call(String imageName, String imageTag, String dockerHubUser) {
    sh """
        docker push ${dockerHubUser}/${imageName}:${imageTag}
    """
}
