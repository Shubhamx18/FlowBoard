def call() {
    sh """
        dependency-check.sh \
        --project Luminary \
        --scan . \
        --format XML \
        --out dependency-check-report
    """
}
