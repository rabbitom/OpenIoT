# 概述
深圳市酷图软件开发有限公司成立于2013年，专注设备智能控制与远程管理解决方案，面向照明、安防、家电等领域，为各类电子产品开发无线连网模块、手机APP及后台管理功能。  
OpenIoT是我们基于项目经验和对行业趋势的理解所构建的一个开源的物联网应用系统，用JavaScript实现。目前主要包含智能照明管理和蓝牙传感器网关两个项目：

## 智能照明管理
智能照明管理系统的目标是将家庭、写字楼、酒店等各类区域的照明系统连接到云端，实现集中管理、自动控制，以达到提升照明效果、提高管理效率、降低能源消耗的目标。我们基于AWS IoT服务设计的系统原型在2016年9月7日-8日于北京举行的AWS技术峰会之黑客马拉松比赛中荣获三等奖。  
* [项目介绍](docs/lighting-intro.md)
* [ZHA USB dongle使用介绍](docs/lighting-zha-dongle.md)
* [连接AWS IoT](docs/lighting-aws-iot.md)
* [在Dragonboard 410c上安装Ubuntu Core](docs/install-ubuntu-core-on-dragonboard.md)
* [打包和布署Snap应用](docs/lighting-gw-snap.md)
* [使用手机APP进行本地控制](docs/lighting-http-app.md)

## 蓝牙传感器网关
用蓝牙连接TI SensorTag传感器套件，收集光照传感器数据，并通过本地WebServer实时显示在网页上。结合照明管理系统还可以实现用SensorTag上的按键开关灯，以及在环境亮度过小时自动开灯。我们在2016年11月26-27日于深圳举行的Jamming With Ubuntu Core黑客马拉松比赛中开发了这个项目，并荣获二等奖。  

## 联系方式
欢迎各界朋友与我们交流合作：  
```
深圳市酷图软件开发有限公司
联系人：郝建林
Email：cooltools@qq.com
ＱＱ：2335301794
手机/微信：188 1855 5615
地址：深圳市南山区科文路1号华富洋大厦四楼思微联合办公空间
```