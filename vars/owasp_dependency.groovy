def call() {
    sh """
        /opt/dependency-check-tool/bin/dependency-check.sh \
        --project Luminary \
        --scan . \
        --format XML \
        --out dependency-check-report \
        --data /opt/dependency-check-data
    """
}
