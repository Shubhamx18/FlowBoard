def call(imageName, tag, dockerHubUser) {
    sh """
        docker build -t ${dockerHubUser}/${imageName}:${tag} .
    """
}
