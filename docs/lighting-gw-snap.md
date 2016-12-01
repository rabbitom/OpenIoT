# 打包和布署Snap应用
## 在开发板上测试
网关程序使用JavaScript开发，由Node.js解释和运行，前期是在PC上开发的，打包之前需要先移植到开发板上。  
由于JavaScript/Node.js本身是跨平台的，所以网关代码基本不需要修改，在开发板上安装好Node.js环境即可运行。  
Ubuntu Core作为一个“Snappy Only”的系统，并不能像其他系统一样随意安装程序，而是需要先安装一个名为“classic”的snap，然后在这个snap提供的环境中安装Node.js。
```
$ sudo snap install classic
$ sudo classic
(classic)$ sudo apt-get install nodejs
```
## 打包
当在classic环境中测试没有问题后，就需要使用Snapcraft工具将网关程序和Node.js环境打成Snap包，关键是编写snapcraft.yaml文件：
```
name: lighting-gw
version: "0.1.0"
summary: Connect local lighing devices to cloud
description: A smartlighting gateway connected to AWS IoT
confinement: devmode

apps:
    lighting-gw:
        command: bin/lighting-gw
        plugs: [serial-port, network, home]

parts:
    lighting-gw:
        plugin: nodejs
        source: .
        node-engine: 6.5.0
```
此文件定义了应用代码和可执行程序的路径，所需的系统资源（串口、网络），以及Node.js的版本。编写好以后，执行snapcraft命令即可生成“.snap”文件。  
每个“.snap”中都可以包含自己的Node.js/Python/JRE版本，相互之间不影响。
## 安装
安装Snap应用前需要先退出classic模式，然后使用snap命令安装：
```
sudo snap install --devmode --force-dangerous lighting-gw_0.1.0_arm64_api.snap 
```
也可以将“.snap”文件复制到其他运行Ubuntu Core的Dragonboard上，然后使用以上命令进行安装，在目标板上并不需要安装classic和Node.js，因为snap包中已经包含了其运行所需的一切。
## 文件访问
Snap运行时的文件系统是只读的，因此安装目录下的文件无法修改，应用的数据要放在专门的数据路径下，此路径可以在Snap环境中使用“SNAP_DATA”环境变量获取。
```
var path = process.env.SNAP_DATA;
```