package net.erabbit.lightingapp;

import android.graphics.Color;

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

}
