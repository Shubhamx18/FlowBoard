def call() {

    sh '''
        echo "Starting OWASP Dependency Check..."

        # Ensure data directory exists
        mkdir -p /opt/dependency-check-data

        # Run Dependency Check
        /opt/dependency-check-tool/bin/dependency-check.sh \
        --project "Luminary" \
        --scan "." \
        --format "XML" \
        --out "dependency-check-report" \
        --data "/opt/dependency-check-data" \
        --disableAssembly \
        --disableNodeAudit

        echo "OWASP Dependency Check Completed"
    '''

}
