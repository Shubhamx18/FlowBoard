<div align="center">

![Luminary Banner](./assets/luminary-banner.svg)

<br/>

[![GitHub](https://img.shields.io/badge/GitHub-Shubhamx18%2FLuminary-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/Shubhamx18/Luminary)
[![DockerHub](https://img.shields.io/badge/DockerHub-shubhamm18-2496ED?style=flat-square&logo=docker&logoColor=white)](https://hub.docker.com/u/shubhamm18)
[![Jenkins](https://img.shields.io/badge/CI%2FCD-Jenkins-D24939?style=flat-square&logo=jenkins&logoColor=white)](#)
[![ArgoCD](https://img.shields.io/badge/GitOps-ArgoCD-EF7B4D?style=flat-square&logo=argo&logoColor=white)](#)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-EKS-326CE5?style=flat-square&logo=kubernetes&logoColor=white)](#)
[![SonarQube](https://img.shields.io/badge/Quality-SonarQube-4E9BCD?style=flat-square&logo=sonarqube&logoColor=white)](#)
[![Trivy](https://img.shields.io/badge/Security-Trivy-1904DA?style=flat-square&logo=aquasecurity&logoColor=white)](#)
[![OWASP](https://img.shields.io/badge/Dependency-OWASP-000000?style=flat-square&logo=owasp&logoColor=white)](#)
[![AWS](https://img.shields.io/badge/Cloud-AWS-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](#)
[![Grafana](https://img.shields.io/badge/Monitoring-Grafana-F46800?style=flat-square&logo=grafana&logoColor=white)](#)

<br/>

</div>

---

## 🖥️ Application Preview

| 🔐 Login Page | 📊 Dashboard |
|:---:|:---:|
| ![Login](./assets/luminary-login.png) | ![Dashboard](./assets/luminary-dashboard.png) |

> Luminary is a **next-gen project management platform** built for teams who ship fast.
> Track projects, manage tasks, monitor completion rates, and catch overdue items — all in a sleek dark UI.

---

## 📌 Project Deployment Flow

<div align="center">

![DevSecOps GitOps Flow](./assets/DevSecOps+GitOps.gif)

</div>

The diagram above shows the complete end-to-end flow:

- **Top box (CI)** — Developer pushes code → Jenkins pulls from GitHub → OWASP dependency check → SonarQube code & quality gate analysis → Trivy filesystem scan → Docker build & push → Triggers CD Job
- **Bottom box (CD)** — Jenkins CD updates Docker image version in k8s manifests → Pushes to GitHub → ArgoCD pulls and deploys on Kubernetes → Prometheus + Grafana monitoring → Gmail notification

---

## 🛠️ Tech Stack

| Category | Tool |
|:---|:---|
| 📁 Source Control | GitHub |
| ⚙️ CI/CD Orchestration | Jenkins (Master + Worker Node) |
| 🔍 Dependency Scanning | OWASP Dependency-Check |
| 📊 Code Quality | SonarQube |
| 🛡️ Filesystem Security | Trivy |
| 🐳 Containerization | Docker |
| 📦 Container Registry | DockerHub |
| 🚀 GitOps Deployment | ArgoCD |
| ☸️ Container Orchestration | Kubernetes |
| 📈 Monitoring | Prometheus + Grafana (via Helm) |
| 📧 Notification | Gmail SMTP — Jenkins Email Extension |
| 🔧 Shared Pipeline Logic | Jenkins Shared Library |

---

## 🔄 Pipeline Flow — Step by Step

### 🔵 CI Pipeline (Luminary-CI)

```
Developer pushes code to GitHub
         │
         ▼
1.  Validate Parameters      →  Ensures FRONTEND_DOCKER_TAG & BACKEND_DOCKER_TAG are set
2.  Workspace Cleanup        →  Cleans Jenkins workspace before build
3.  Git: Code Checkout       →  Clones Luminary repo (main branch)
4.  Trivy: Filesystem Scan   →  Scans source code for vulnerabilities
5.  OWASP: Dependency Check  →  Audits dependencies against NVD for known CVEs
6.  SonarQube: Code Analysis →  Runs static analysis on the codebase
7.  SonarQube: Quality Gate  →  ❌ Pipeline fails if quality thresholds not met
8.  Update Env (Optional)    →  Runs automate_update_env_ip.sh if present
9.  Docker: Login            →  Authenticates to DockerHub
10. Docker: Build Images     →  Builds luminary-backend & luminary-frontend images
11. Docker: Push Images      →  Pushes versioned images to DockerHub
         │
         ▼
POST SUCCESS → Automatically triggers Luminary-CD pipeline
```

### 🟢 CD Pipeline (Luminary-CD)

```
Triggered by CI (receives FRONTEND_DOCKER_TAG & BACKEND_DOCKER_TAG)
         │
         ▼
1.  Workspace Cleanup             →  Fresh workspace
2.  Git: Code Checkout            →  Clones repo to access Kubernetes manifests
3.  Verify: Docker Image Tags     →  Validates that tags are not empty
4.  Update: Kubernetes Manifests  →  sed replaces image tags in backend.yml & frontend.yml
5.  Git: Commit & Push            →  Pushes updated manifests to GitHub (main)
         │
         ▼
POST SUCCESS → HTML email notification sent via Gmail
         │
         ▼
ArgoCD detects manifest change → Auto-Syncs → Deploys to Kubernetes ✅
```

---

## 🖼️ Project Screenshots

### ⚙️ CI Pipeline — Luminary-CI (Stage View)

> All stages passing: Validate → Workspace Cleanup → Git Checkout → Trivy → OWASP → SonarQube Analysis → Quality Gate → Update Env → Docker Login → Build Images → Push Images

![Luminary-CI Stage View](./assets/luminary-ci.png)

---

### 🚢 CD Pipeline — Luminary-CD (Stage View)

> Workspace Cleanup → Git Checkout → Verify Docker Tags → Update K8s Manifests → Git Commit & Push to GitHub

![Luminary-CD Stage View](./assets/luminary-cd.png)

---

### 🐙 ArgoCD — Application Deployment on Kubernetes

> Luminary app **Synced** and **Healthy** — ConfigMap, Secrets, PVC, Deployments, Services, and Pods all green ✅

![ArgoCD Deployment](./assets/argocd.png)

---

### 📊 Grafana — Kubernetes Workload Monitoring

> Real-time CPU usage, CPU quota, and Memory usage per pod — full workload visibility across all namespaces

![Grafana Dashboard](./assets/grafana.png.png)

---

### 🔍 SonarQube — Jenkins Webhook Integration

> SonarQube notifies Jenkins via webhook after every analysis — enabling the Quality Gate stage to pass or fail the pipeline in real-time

![SonarQube Webhook](./assets/sonarqube-webhook.png)

---

### 📦 OWASP — Dependency-Check Trend

> Vulnerability trend tracked across all builds. **Medium** severity findings detected from build #15 onwards — zero **Critical** vulnerabilities across the entire build history ✅

![OWASP Dependency-Check Trend](./assets/dependency-check.png)

---

## 🔐 Security Integrations

### 🛡️ Trivy — Filesystem Scan
Trivy scans the entire source code filesystem **before** any Docker build happens. Critical vulnerabilities surface in pipeline logs, stopping insecure images from being built or pushed.

### 🔎 OWASP Dependency-Check
Audits all project dependencies against the National Vulnerability Database (NVD). The full report is published as a Jenkins artifact (`dependency-check-report.xml`) with a live trend chart visible on the pipeline dashboard.

### ✅ SonarQube Quality Gate
Static code analysis with enforced quality gates. The pipeline **will not proceed** to Docker builds if the gate fails. A SonarQube webhook notifies Jenkins instantly after analysis — no polling, real-time gate evaluation.

---

## ⚙️ Jenkins Shared Library

All reusable pipeline logic is abstracted into a **Jenkins Shared Library** (`@Library('shared') _`), keeping both Jenkinsfiles clean and DRY.

| Function | Purpose |
|:---|:---|
| `code_checkout(url, branch)` | Clones a GitHub repository |
| `trivy_scan()` | Runs Trivy filesystem vulnerability scan |
| `sonarqube_analysis(tool, project, key)` | Executes SonarQube static analysis |
| `sonarqube_code_quality()` | Waits for and evaluates the Quality Gate result |
| `docker_login(credId)` | Authenticates to DockerHub |
| `docker_build(name, tag, registry)` | Builds a Docker image |
| `docker_push(name, tag, registry)` | Pushes image to DockerHub |

---

## 🚀 ArgoCD — GitOps Deployment

ArgoCD watches the `kubernetes/` directory in GitHub. When the CD pipeline commits updated image tags, ArgoCD takes over completely:

1. Detects the manifest change automatically (Auto-Sync enabled)
2. Applies updated `backend.yml` and `frontend.yml` to the Kubernetes cluster
3. Rolls out new pods with zero-downtime deployment
4. All resources show **Healthy** ✅ on the ArgoCD dashboard

**Kubernetes Resources managed by ArgoCD:**

| Resource | Kind |
|:---|:---|
| `luminary-config` | ConfigMap |
| `luminary-secrets` | Secret |
| `mysql-pvc` | PersistentVolumeClaim |
| `backend` | Deployment + Service |
| `frontend` | Deployment + Service |
| `mysql` | Deployment + Service |

---

## 📊 Monitoring — Prometheus & Grafana

Deployed via **Helm** (`kube-prometheus-stack`) in a dedicated `prometheus` namespace.

```bash
# Add Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Create namespace and install
kubectl create namespace prometheus
helm install stable prometheus-community/kube-prometheus-stack -n prometheus

# Expose Prometheus (ClusterIP → NodePort)
kubectl edit svc stable-kube-prometheus-sta-prometheus -n prometheus

# Expose Grafana (ClusterIP → NodePort)
kubectl edit svc stable-grafana -n prometheus

# Get Grafana admin password
kubectl get secret --namespace prometheus stable-grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode; echo
```

Grafana dashboards provide real-time visibility into CPU usage, CPU quota, memory usage, and workload-level drill-down across all namespaces.

---

## 📧 Email Notification

On every successful CI/CD run, Jenkins sends an **HTML email** containing the job name, build number, and a direct build URL — with the full build log attached. Configured via the Jenkins Extended Email Notification plugin using Gmail App Password SMTP on port 465.

---

## 📁 Repository Structure

```
Luminary/
├── assets/                        # Screenshots & GIF for README
│   ├── DevSecOps+GitOps.gif
│   ├── luminary-login.png.png
│   ├── luminary-dashboard.png
│   ├── luminary-ci.png
│   ├── luminary-cd.png
│   ├── argocd.png
│   ├── grafana.png.png
│   ├── sonarqube-webhook.png
│   └── dependency-check.png
├── backend/                       # Node.js/Express backend
│   └── Dockerfile
├── frontend/                      # React frontend
│   └── Dockerfile
├── kubernetes/                    # K8s manifests (auto-updated by CD pipeline)
│   ├── backend.yml
│   └── frontend.yml
├── Jenkinsfile-CI                 # CI pipeline definition
├── Jenkinsfile-CD                 # CD pipeline definition
└── automate_update_env_ip.sh      # Optional: env IP updater script
```

---

## 🔑 Jenkins Credentials Required

| Credential ID | Type | Purpose |
|:---|:---|:---|
| `docker` | Username/Password | DockerHub authentication |
| `github-token` | Git Username/Password (PAT) | Push manifest updates to GitHub |
| `sonar` | Secret Text | SonarQube token for analysis |
| Gmail App Password | Username/Password | Email notification via SMTP port 465 |

---

## 💡 Key Design Decisions

**GitOps over direct kubectl** — The CD pipeline never runs `kubectl apply`. It commits to Git, and ArgoCD syncs the cluster. Git is always the single source of truth for cluster state.

**`propagate: false` in CI trigger** — CI triggers CD with `propagate: false`, meaning a CD failure won't retroactively mark the CI build as failed. Both pipelines are tracked independently.

**Idempotent Git commits** — The CD pipeline checks `git diff --cached --quiet` before committing. If the image tag is unchanged between runs, no empty commit is created.

**Shared Library abstraction** — All tool-specific logic lives in the shared library. Jenkinsfiles stay clean, readable, and require zero duplication across pipelines.

---

<div align="center">

## 📬 Contact

**Author:** Shubham Mali

[![GitHub](https://img.shields.io/badge/GitHub-Shubhamx18-181717?logo=github&logoColor=white)](https://github.com/Shubhamx18)
[![DockerHub](https://img.shields.io/badge/DockerHub-shubhamm18-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/u/shubhamm18)

---

⭐ **If this project helped you, consider giving it a star on GitHub!** ⭐

</div>
