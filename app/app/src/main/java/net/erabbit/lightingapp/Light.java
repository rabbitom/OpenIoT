package net.erabbit.lightingapp;

import android.graphics.Color;
import android.os.Handler;

import net.erabbit.common_lib.HttpRequestThread;

import java.util.ArrayList;

/**
 * Created by Tom on 2016/11/14.
 */

public class Light {

    private static final int[] colors = {Color.RED, Color.YELLOW, Color.GREEN, Color.CYAN, Color.BLUE, Color.MAGENTA, Color.WHITE};

    private static ArrayList<Integer> lightColors;

    public static ArrayList<Integer> getLightColors() {
        if(lightColors == null) {
            lightColors = new ArrayList<>();
            for (int colorValue : colors) {
                lightColors.add(colorValue);
            }
        }
        return lightColors;
    }

    private static ArrayList<String> lights;

    public static ArrayList<String> getLights() {
        if(lights == null) {
            lights = new ArrayList<>();
            for(int i=0; i<3; i++)
                lights.add("Light" + String.format("%d", i+1));
        }
        return lights;
    }

    //static String baseUrl = "http://192.168.199.14:9000/api";
    static String serverIp = "192.168.199.14";

    static String getUrl(String suffix) {
        return "http://" + serverIp + ":9000/api" + suffix;
    }

    public static void setServerIp(String ip) {
        serverIp = ip;
    }

    public static String getServerIp() {
        return serverIp;
    }

    public static final int MSG_GET_LIGHTS = 101;
    public static final int MSG_LIGHT_POWER = 102;
    public static final int MSG_LIGHT_COLOR = 103;

    public static final int LIGHT_POWER_ON = 1;
    public static final int LIGHT_POWER_OFF = 0;

    public static void setLightPower(String lightId, int power, Handler handler) {
        String url = getUrl("/light/" + lightId + "/" + power);
        HttpRequestThread thread = new HttpRequestThread(url, handler, MSG_LIGHT_POWER);
        thread.start();
    }

    public static void setLightColor(String lightId, int color, Handler handler) {
        String url = getUrl("/colors/" + lightId);
        HttpRequestThread thread = new HttpRequestThread(url, handler, MSG_LIGHT_COLOR);
        float hsv[] = new float[3];
        Color.colorToHSV(color, hsv);
        thread.addParam("hue", (int)(hsv[0] / 360 * 254));
        thread.addParam("saturation", (int)(hsv[1] * 254));
        thread.addParam("brightness", (int)(hsv[2] * 255));
        thread.start();
    }
}
