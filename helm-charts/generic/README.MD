

# Single command for install and upgrade 

    helm upgrade apps  ./generic/apps --values  ./generic/values.yaml --install  

# Removing helm chart 

    helm uninstall apps


helm upgrade web helm-charts/generic/apps --install --wait --atomic --namespace=default --values=helm-charts/generic/web-values.yaml "svc[0].docker_image=registry.digitalocean.com/procycla/web:latest"


--set svc[0].name=web,svc[0].docker_image=[registry.digitalocean.com/procycla/web/latest](https://registry.digitalocean.com/procycla/web:latest)
    