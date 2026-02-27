# Installation Guide

Follow these steps to deploy the dashboard in a production environment.

## 1. Prerequisites
* **Docker & Docker Compose** installed on the Dashboard computer.
* **MediaMTX** running on the remote node (`192.168.8.23`).
* Firewall rules allowing **TCP Port 9997** (API) and **TCP Port 7000** (Frigate) from the Dashboard network.

## 2. Configuration
Ensure your `mediamtx.yml` (on the remote server) has the API enabled:
```yaml
api: yes
apiAddress: :9997