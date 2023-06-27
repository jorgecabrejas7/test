# Prerequisites

- Docker 
- Helm 
- Kubectl 
- doctl 
- 
# Create Kubernetes cluster [ Digital Ocean console ] 

Visit DO console : https://cloud.digitalocean.com/kubernetes/clusters 

CLick ->  Create Cluster  Select region, default VPC, version( 1.27.2)

Wait time : ~ 5-15 mins on DO side

# Create  personal token [ Digital Ocean console ] 

Visit DO console : https://cloud.digitalocean.com/account/api/tokens
z`
CLick ->  Generate New Token -> Save the generatedValue (Important)

# Authenticate with a cluster via doctl  [command line ] 

Prerequisite : personal token 


    doctl auth init --context k8s-proc

Copy  in : the token


❯ Enter your access token:  ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●

Validating token... ✔

# Download Kubeconfig & set the kubernetes context [command line ] 

Go to Kubernetes in DO console -> Select the cluster -> Overview -> Connecting to Kubernetes


Run in terminal : 


    doctl kubernetes cluster kubeconfig save bd52dbd1-3845-4b36-b71d-1ca296c67e07 --context k8s-proc


Notice: Adding cluster credentials to kubeconfig file found in "/Users/adv/.kube/config"
Notice: Setting current-context to do-ams3-k8s-1-27-2-do-0-ams3-1685620643660



# Verify connectivity to the cluster

    kubectl get no

Example output : 

(base) ➜  procycla-deployment git:(main) ✗ kubectl get no
NAME                   STATUS   ROLES    AGE     VERSION
pool-jpxfcjkm8-fayet   Ready    <none>   7m59s   v1.27.2


# Installing Nginx Ingresss Controller

Prerequisite : HELM CLI [ https://helm.sh/docs/intro/install/]

    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update

    helm install nginx-ingress ingress-nginx/ingress-nginx --set controller.publishService.enabled=true

Wait time : ~ 3 mins to provision the LoadBalancer on Digital Ocean side 

Verify the assigned IP of the LoadBalancer

    kubectl get svc  nginx-ingress-ingress-nginx-controller

# For testing purposes and proper routing, we need DNS names

Based on the IP of the LoadBalancer https://cloud.digitalocean.com/networking/domains , you need to create a DNS name

For our example, we gonna use free NIP loopback DNS. We can prefix their domain with IP, which will automaticlaly route to our LoadBalancer

https://nip .io/

nginx.174.138.104.100.nip.io https://nip.io/

You can use your custom DNS provider, but then you need to point the DNS record to the IP of the Load Balancer (you can create many DNS records like web.example.com/ api.example.com or a single Wildcard DNS record [*])

# Creating a Digital ocean Container Registry 

Visit DO console : https://cloud.digitalocean.com/registry 


    Click on Create (assign a name; save it for later)

This container registry will be used in the Github Workflows to push images, as well it will substitude its name into the HELM values files to build certain components



# Installing mariaDB

#### Export HELM OCI variable, to get access to OCI registries


    export HELM_EXPERIMENTAL_OCI=1

#### Bitnami MariaDB

Docs : https://github.com/bitnami/charts/blob/main/bitnami/mariadb/Chart.yaml

    helm install my-release oci://registry-1.docker.io/bitnamicharts/mariadb  --version 12.2.4  --set auth.password=procycla --set auth.user=procycla --set auth.database=procycla --set auth.rootPassword=procycla

####  Get the DB root user password

Default user name of DB use is "root" : 

    kubectl get secret --namespace default my-release-mariadb -o jsonpath="{.data.mariadb-root-password}" | base64 -d

#### Connect to DB with SQL (optional; veryfing the creds)

    kubectl run my-release-mariadb-client --rm --tty -i --restart='Never' --image  docker.io/bitnami/mariadb:10.11.3-debian-11-r5 --namespace default --command -- bash
    mysql -h my-release-mariadb.default.svc.cluster.local -u root -p procycla



# Deploying the Helm Charts 

Deployment is done via GITHUG workflow files (.github/workflows) 

What need to be changed per new env : 

Set 3 secrets in Github repo (Settings > Secrets and variables > New repository secret)

- DIGITALOCEAN_REGISTRY_NAME : name of the Digital Ocean registry create above (example : registry.digitalocean.com/procycla) 
- DIGITALOCEAN_K8S_ID : ID of the Kubernetes cluster (example : bd52dbd1-3845-4b36-b71d-1ca296c67e07 )
- DIGITALOCEAN_ACCESS_TOKEN : personal token from step 1/2

Update the YAML *-values.yaml files with proper DNS names under helm-charts/generic

In every file properly updated according to its component/dns name : 
Example : 
    host : "api.174.138.104.100.nip.io"

Env variable values which reference the API urls, has to be updated in every yaml file
Example : 
 - name: "BMP_API_URL"
      value: "http://bpm.174.138.104.100.nip.io"

# After the Secrets, Yaml workflows, Yaml files updated

After you will commit the changes to YAML files together with the workflow files, pipeline will attempt to build images, and install them via HELM chart to Kubernetes clutser
Github action triggered according to the file changes in specific component folders. Pipeline per component. MariaDB & NGINX are installed manually in beginning of this procedure