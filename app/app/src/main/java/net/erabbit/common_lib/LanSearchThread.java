package net.erabbit.common_lib;

import android.bluetooth.BluetoothClass;
import android.os.Handler;
import android.os.Message;
import android.util.Log;

import java.lang.ref.WeakReference;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;

public class LanSearchThread extends Thread {

	public interface LanSearchListener {
		void onLanSearchStarted();
		void onLanDeviceFound(DeviceInfo deviceInfo);
		void onLanDeviceNotFound();
	}

	public static class LanSearchHandler extends Handler {
		public LanSearchHandler(LanSearchListener listener){
			wListener = new WeakReference<>(listener);
		}
		WeakReference<LanSearchListener> wListener;
		@Override
		public void handleMessage(Message msg) {
			LanSearchListener listener = wListener.get();
			if(listener != null) {
				switch (msg.what) {
					case MSG_SEARCH_STARTED:
						listener.onLanSearchStarted();
						break;
					case MSG_DEVICE_FOUND:
						listener.onLanDeviceFound((DeviceInfo)msg.obj);
						break;
					case MSG_DEVICE_NOT_FOUND:
						listener.onLanDeviceNotFound();
						break;
				}
			}
		}
	}

	public static class DeviceInfo {
		public String getAddress() {
			return address;
		}

		public String getMessage() {
			return message;
		}

		String address;
		String message;
	}

	public static final int SEARCH_TIMEOUT = 5000;
	public static final int SEARCH_DEVICE_TRY_MAX_TIMES = 1;

	static final int MSG_SEARCH_STARTED = 1;
	static final int MSG_DEVICE_FOUND = 2;
	static final int MSG_DEVICE_NOT_FOUND = 3;

	public static final int DEVICE_PORT = 9000;

	private static final int MSG_BLOCK_SIZE = 1024;

	DatagramSocket socket;
	byte recvBuffer[] = new byte[MSG_BLOCK_SIZE];
	DatagramPacket recvPacket = new DatagramPacket(recvBuffer, recvBuffer.length);

	Handler uiHandler;

	public static void SearchDevice(Handler uiHandler) {
		LanSearchThread thread = new LanSearchThread(uiHandler);
		thread.start();
	}

	LanSearchThread(Handler uiHandler) {
		this.uiHandler = uiHandler;
	}
	
	public void run() {
		DeviceInfo deviceInfo = null;
		byte connectMsg[] = "{\"from\":\"Android\"}".getBytes();
		int searchCount = 0;
		int recvLen = 0;
		//启动线程，发送广播，接收数据
		Log.i("LanSearchThread", "started");
		try {
			socket = new DatagramSocket();
			socket.setBroadcast(true);
			socket.setSoTimeout(SEARCH_TIMEOUT);
			DatagramPacket broadcastPacket = new DatagramPacket(connectMsg, connectMsg.length, InetAddress.getByName("255.255.255.255"), DEVICE_PORT);
			while(true) {
				socket.send(broadcastPacket);
				Log.i("LanSearchThread", "sent broadcast: " + CoolUtility.MakeHexString(connectMsg, connectMsg.length));
				uiHandler.sendMessage(uiHandler.obtainMessage(MSG_SEARCH_STARTED));
				try {
					socket.receive(recvPacket);
					recvLen = recvPacket.getLength();
					break;//接收成功即跳出循环
				}
				catch(SocketTimeoutException timeout) {
					if(++searchCount >= SEARCH_DEVICE_TRY_MAX_TIMES)
						throw(timeout);//接收超时并且达到最大搜索次数即退出
					else
						Log.i("LanSearchThread", "retry " + searchCount);
				}
			}
		} catch (Exception e) {
			Log.i("LanSearchThread", e.toString());
		}
		//判断有无接收到数据
		if(recvLen > 0) {
			Log.i("LanSearchThread.Recv", CoolUtility.MakeHexString(recvBuffer, recvLen));
			//设备信息
			deviceInfo = new DeviceInfo();
			//设备IP地址
			deviceInfo.address = recvPacket.getAddress().getHostAddress();
			//解析接收到的数据
			deviceInfo.message = new String(recvBuffer, 0, recvLen);
		}
		//关闭socket
		socket.disconnect();
		socket.close();
		Log.i("LanSearchThread", "socket closed.");
		//发送消息
		if(deviceInfo != null)
			uiHandler.sendMessage(uiHandler.obtainMessage(MSG_DEVICE_FOUND, deviceInfo));
		else
			uiHandler.sendMessage(uiHandler.obtainMessage(MSG_DEVICE_NOT_FOUND));
	}

}
