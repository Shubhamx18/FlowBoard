def call(String repoUrl, String branchName) {
    checkout([
        $class: 'GitSCM',
        branches: [[name: branchName]],
        userRemoteConfigs: [[
            url: repoUrl
        ]]
    ])
}
