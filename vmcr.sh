#!/bin/bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo apt-mark unhold containerd
sudo apt remove -y containerd
sudo apt remove -y --purge containerd containerd.io
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl unmask docker
sudo systemctl enable docker
sudo systemctl start docker
sudo systemctl unmask docker.socket
sudo systemctl enable docker.socket
sudo systemctl start docker.socket
sudo systemctl enable docker.service
sudo systemctl start docker.service
sudo systemctl unmask containerd.service
sudo systemctl enable containerd.service
sudo systemctl start containerd.service
