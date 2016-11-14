package net.erabbit.common_lib;

import java.util.ArrayList;

public class CoolUtility {
	
	public static String MakeHexString(byte[] buffer, int len)
	{
		String hexStr = "";
		for(int i=0; i<len; i++)
			hexStr = hexStr.concat(String.format("%1$02X", buffer[i]));
		return hexStr;
	}
	
	public static String MakeHexString(byte[] buffer, int len, String gap)
	{
		String hexStr = "";
		for(int i=0; i<len; i++)
			hexStr = hexStr.concat(String.format("%1$02X", buffer[i]) + gap);
		return hexStr;
	}
	
	public static byte[] fromHexString(String hexStr) {
		ArrayList<Integer> ints = new ArrayList<Integer>();
		char[] hexChars = hexStr.toCharArray();
		int hValue = -1;
		for(int i=0; i<hexChars.length; i++) {
			int value = fromHexChar(hexChars[i]);
			if(hValue == -1)
				hValue = value;
			else if(value != -1) {
				ints.add(hValue * 16 + value);
				hValue = -1;
			}
		}
		int intCount = ints.size();
		if(intCount > 0) {
			byte[] bytes = new byte[intCount];
			for(int i=0; i<intCount; i++)
				bytes[i] = toByte(ints.get(i));
			return bytes;
		}
		else
			return null;
	}
	
	protected static int fromHexChar(char ch) {
		if((ch >= '0') && (ch <= '9'))
			return ch - '0';
		else if((ch >= 'a') && (ch <= 'f'))
			return ch - 'a' + 10;
		else if((ch >= 'A') && (ch <= 'F'))
			return ch - 'A' + 10;
		else
			return -1;
	}
	
	public static byte toByte(int x) {
		return (byte)(x & 0x000000ff);
	}
		
	public static int toInt(byte b) {
		return 0x000000ff & b;
	}
	
	public static int MakeInt(byte lByte, byte hByte) {
		int l = lByte;
		int h = hByte;
		return (((h << 8) & 0x0000ff00) | (l & 0x000000ff));
	}
	
	public static int toInt(byte[] bytes, int offset, int len) {
		int value = 0;
		for(int i=0; i<len; i++) {
			value = value << 8;//高位在前
			value = value | toInt(bytes[offset+i]);
		}
		return value;
	}
	
}
