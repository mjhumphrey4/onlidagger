# How to Use Vultr's Webmin Marketplace Application

## Introduction

Webmin is a web-based server administration control panel for Linux and Unix-like systems. Vultr's Webmin Marketplace application offers a production-ready solution for managing a Linux server, hosting web applications, and running multiple services, including web servers, email, and databases.

This guide explains how to use Vultr's Webmin Marketplace application to manage a Linux server and host multiple applications through Webmin's web-based graphical control panel.

### Prerequisites

Before you begin, make sure you:

* Set up a dedicated domain such as `webmin.example.com` to point to your instance's public IP address.

## Webmin Features

Webmin offers several features that make it a powerful and dedicated control panel for server management tasks.

* **Nginx/Apache Support**: Webmin supports Nginx and Apache web server applications by default, enabling you to build and host web applications.
* **Server Monitoring**: Webmin includes built-in tools for monitoring server processes, storage, disk health, and memory for full system administration.
* **Built-in Firewall**: Webmin supports UFW, iptables, ip6tables, and IPFW for enhanced server and application security.
* **Community Support**: Webmin is actively developed and open-source, offering advanced community support for feature releases and system updates.
* **Multi-server Clustering**: Webmin lets you run multiple servers in the form of clusters, enabling smooth management and application development.

## Deploy Vultr's Webmin Marketplace Application

Follow the steps below to deploy Vultr's Webmin Marketplace application on a fresh instance.

1. Log in to the [Vultr Console](https://console.vultr.com/).
1. Expand **Compute** and select **Instances** from the list.
1. Click **Create Instance** to open the deployment page.
1. Select your desired server plan, such as **Dedicated CPU**.
1. Choose a plan type such as **CPU Optimized** and specify the server configuration, such as 2 vCPUs, 4 GB RAM, and 50 GB storage.
1. Click **Configure** and select **Marketplace Application**.
1. Enter `Webmin` in the Marketplace App search bar, and select Webmin from the results.
1. Specify the server hostname and select any additional features to activate on the instance.
1. Click **Deploy** and monitor the instance deployment status.
1. Click the instance to open its management page and verify the generated Webmin details.

    ![Webmin App Instructions](https://i.postimg.cc/NGmB7pnJ/Webmin-Details.png)

    > [!NOTE]
    > Copy your instance's public IP address and set it as the DNS **A** record for your dedicated domain, such as `webmin.example.com`.

## Access and Set Up Webmin

You have deployed Vultr's Webmin Marketplace application. Follow the steps below to access and set up Webmin.

1. Access the default Webmin port `10000` using your instance's IP address in a web browser such as Chrome.

    ```
    http://server-ip:10000
    ```

1. Skip the insecure connection prompt to access the Webmin login page.
1. Enter the default `root` username and the generated password copied from the instance's management page.

    ![Webmin Login](https://i.postimg.cc/XNd4cQhW/Webmin-Login.png)

1. Click **Sign In** to log in to Webmin.
1. Monitor the system information and statistics in your Webmin dashboard.

    ![Webmin Dashboard](https://i.postimg.cc/7P0wMmcD/Webmin-Dashboard.png)

1. Click **Networking** in the left navigation bar and select **Network Configuration**.

    ![Configure Webmin DNS](https://i.postimg.cc/1RwscJT1/webmin-host.png)

1. Replace `Vultr` with your domain, such as `webmin.example.com`.
1. Click **Save** to apply the changes.
1. Click **Unused Modules** and select **Apache Webserver** to install it.
1. Click **Install**, verify the list of packages to install, and click **Install Now**.

    ![Webmin Install Apache](https://i.postimg.cc/fyKPqtmY/install-apache.png)

1. Monitor the installation process and verify that Apache is added to Webmin.
1. Click **Webmin** and select **Webmin Configuration** to configure it.
1. Select **SSL Encryption** from the configuration options.

    ![Webmin SSL](https://i.postimg.cc/BZH4cMy0/SSL-Webmin.png)

1. Navigate to **SSL Provider**.
1. Replace your server IP address with your `webmin.example.com` domain.
1. Choose **Selected Apache virtual host** as the validation method.

    ![Enable SSL Cert for Webmin](https://i.postimg.cc/ryxMCQHv/Request-SSL-Cert.png)

1. Click **Request Certificate** to generate an SSL certificate using Let's Encrypt to secure Webmin.
1. Verify that the SSL certificate request is successful, then refresh Webmin to confirm that your connection is closed.
1. Access Webmin again on port `10000` using your domain and verify that your connection is secure.

    ```
    https://webmin.example.com
    ```

## Host Web Applications Using Webmin

Webmin includes multiple modules that you can use for various tasks, including web development and hosting. Follow the steps below to use the Apache webserver module you installed earlier to serve a basic web application on your server.

1. Click **Servers** in the left navigation menu and select **Apache Webserver**, or find it under **Unused Modules**.
1. Navigate to **Create Virtual Host**.
1. Select **Specific address** and enter your domain, such as `app.example.com`, in the appropriate field.
1. Enter `/var/www/html` in the **Document Root** field, or specify another directory for your web application files.

    ![Apache Virtual Host Config](https://i.postimg.cc/y6csXv54/Create-vhost.png)

1. Click **Create Now** to apply the new Apache virtual host configuration.
1. Click **Apply Changes** to reload and apply the Apache configuration.
1. Click **Tools** in the left navigation menu and select **Terminal** from the list.
1. Enter the following commands in the terminal to overwrite the `/var/www/html/index.html` file with new application logic.

    ```console
    # echo " <html><head>Sample App</head><body><h1>Greetings from Vultr</h1></body></html>" > /var/www/html/index.html
    ```

1. Open your `app.example.com` domain in a web browser and verify that the web application loads.

    ```
    http://app.example.com
    ```

    ![Sample Application Hosted on Webmin](https://i.postimg.cc/3rmYCnqc/sample-app.png)

## Conclusion

In this guide, you have deployed and used Vultr's Webmin Marketplace application. You can use Webmin to manage your entire Linux server, deploy applications, and manage system processes. You can install multiple modules, including Virtualmin and Usermin, to extend Webmin's functionality.
