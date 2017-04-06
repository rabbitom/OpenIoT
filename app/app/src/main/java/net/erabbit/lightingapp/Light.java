package net.erabbit.lightingapp;

import android.graphics.Color;
import android.os.Handler;

import net.erabbit.common_lib.HttpThread;

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

    static String serverIp = "192.168.0.100";

    static String getUrl(String suffix) {
        return "http://" + serverIp + ":9000" + suffix;
    }

    public static void setServerIp(String ip) {
        serverIp = ip;
    }

    public static String getServerIp() {
        return serverIp;
    }

    public static final int MSG_LIGHT = 100;
    public static final int MSG_GET_LIGHTS = 101;
    public static final int MSG_LIGHT_POWER = 102;
    public static final int MSG_LIGHT_COLOR = 103;
    public static final int MSG_LIGHT_COLOR_TEMPERATURE = 104;

    public static final int LIGHT_POWER_ON = 1;
    public static final int LIGHT_POWER_OFF = 0;
    public static final int LIGHT_LUMINANCE_HALF = 0x80;
    public static final int LIGHT_LUMINANCE_FULL = 0xFF;
    public static final int LIGHT_COLOR_TEMPERATURE_COLD = 1;
    public static final int LIGHT_COLOR_TEMPERATURE_WARM = 65279;

    public static void setLightPower(String lightId, int power, Handler handler) {
        String url = getUrl("/command/light/power");
        HttpThread thread = new HttpThread(url, handler, MSG_LIGHT_POWER);
        thread.addParam("id", lightId);
        thread.addParam("operation", (power == LIGHT_POWER_ON) ? "on" : "off");
        thread.start();
    }

    public static void setLightColor(String lightId, int color, Handler handler) {
        String url = getUrl("/command/light/hueSaturation");
        HttpThread thread = new HttpThread(url, handler, MSG_LIGHT_COLOR);
        float hsv[] = new float[3];
        Color.colorToHSV(color, hsv);
        thread.addParam("id", lightId);
        thread.addParam("hue", (int)(hsv[0] / 360 * 254));
        thread.addParam("saturation", (int)(hsv[1] * 254));
        thread.addParam("duration", 2);
        thread.start();
    }

    public static void setLightColorTemperature(String lightId, int colorTemperature, Handler handler) {
        String url = getUrl("/command/light/colorTemperature");
        HttpThread thread = new HttpThread(url, handler, MSG_LIGHT_COLOR_TEMPERATURE);
        thread.addParam("id", lightId);
        thread.addParam("colorTemperature", colorTemperature);
        thread.addParam("duration", 2);
        thread.start();
    }

    public static void setLightLuminance(String lightId, int lum, Handler handler) {
        String url = getUrl("/command/light/lum");
        HttpThread thread = new HttpThread(url, handler, MSG_LIGHT);
        thread.addParam("id", lightId);
        thread.addParam("lum", lum);
        thread.addParam("duration", 2);
        thread.start();
    }

    public static void idLight(String lightId, Handler handler) {
        String url = getUrl("/command/ha/blink");
        HttpThread thread = new HttpThread(url, handler, MSG_LIGHT);
        thread.addParam("id", lightId);
        thread.addParam("time", 2);
        thread.start();
    }
}
