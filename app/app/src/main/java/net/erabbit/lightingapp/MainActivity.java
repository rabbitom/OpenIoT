package net.erabbit.lightingapp;

import android.app.AlertDialog;
import android.app.FragmentManager;
import android.app.FragmentTransaction;
import android.content.DialogInterface;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.ViewFlipper;

import java.util.ArrayList;

public class MainActivity extends BaseActivity
        implements LightFragment.OnLightFragmentInteracionListener, View.OnClickListener {

    protected class TabItem implements View.OnClickListener {
        public final String name;

        Drawable normalIcon;
        Drawable highlightIcon;

        public TabItem(int nameId, int normalIconId, int highlightIconId) {
            name = getString(nameId);
            setIcon(normalIconId, highlightIconId);
        }

        public TabItem(String name, int normalIconId, int highlightIconId) {
            this.name = name;
            setIcon(normalIconId, highlightIconId);
        }

        void setIcon(int normalIconId, int highlightIconId) {
            normalIcon = getResources().getDrawable(normalIconId);
            if(normalIcon != null)
                normalIcon.setBounds(0, 0, normalIcon.getIntrinsicWidth(), normalIcon.getIntrinsicHeight());
            highlightIcon = getResources().getDrawable(highlightIconId);
            if(highlightIcon != null)
                highlightIcon.setBounds(0, 0, highlightIcon.getIntrinsicWidth(), highlightIcon.getIntrinsicHeight());
        }

        protected int normalTextColor = Color.WHITE;
        protected int highlightTextColor = Color.WHITE;
        public void setTextColor(int normalColor, int hilightColor) {
            normalTextColor = normalColor;
            highlightTextColor = hilightColor;
            if(view != null)
                view.setTextColor(highlight ? hilightColor : normalColor);
        }

        protected TextView view;
        public TextView getView() {
            return view;
        }
        public void createView(ViewGroup parentView) {
            createView(parentView, this);
        }
        public void createView(ViewGroup parentView, View.OnClickListener onClickListener) {
            view = (TextView)getLayoutInflater().inflate(R.layout.tab, parentView, false);
            view.setText(name);
            parentView.addView(view);
            view.setOnClickListener(onClickListener);
            setHighlight(highlight);
        }

        protected boolean highlight = false;
        public boolean getHighlight() {
            return highlight;
        }
        public void setHighlight(boolean highlight) {
            this.highlight = highlight;
            if(view != null) {
                view.setCompoundDrawables(null, highlight ? highlightIcon : normalIcon, null, null);
                view.setTextColor(highlight ? highlightTextColor : normalTextColor);
            }
        }

        @Override
        public void onClick(View view) {
            setHighlight(!highlight);
            onTabSwitched(this, highlight);
        }
    }

    Light mLight;
    LightFragment lightFragment;

    ArrayList<TabItem> tabs = new ArrayList<>();

    View deviceControlView;
    ViewFlipper views;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        actionBarRightIcon.setOnClickListener(this);

        deviceControlView = findViewById(R.id.activity_main);
        views = (ViewFlipper)findViewById(R.id.views);

        for(String light : Light.getLights()) {
            TabItem lightTab = new TabItem(light, R.drawable.light_normal, R.drawable.light_pressed);
            tabs.add(lightTab);
        }
        allLightsMask = (int)Math.pow(2, tabs.size()) - 1;
        LinearLayout tabsHolder = (LinearLayout)findViewById(R.id.tabs);
        for(TabItem tab : tabs) {
            tab.createView(tabsHolder);
            tab.setTextColor(getResources().getColor(R.color.tab_text_normal), getResources().getColor(R.color.tab_text_hilight));
        }

        setBgColor(R.color.bg_light);

        lightFragment = LightFragment.newInstance(Light.getLightColors());
        FragmentManager fragmentManager = getFragmentManager();
        FragmentTransaction fragmentTransaction = fragmentManager.beginTransaction();
        fragmentTransaction.add(R.id.views, lightFragment);
        fragmentTransaction.commit();

        views.setDisplayedChild(0);
    }

    int curLightsMask = 0;
    int allLightsMask = 0;

    public void onTabSwitched(TabItem tab, boolean highlighted) {
        int index = tabs.indexOf(tab);
        Light.idLight(Light.getLights().get(index), apiHandler);
        //Log.d("ui", String.format("Light%d %s", index+1, highlighted ? "selected" : "deselected"));
        int lightMask = (int)Math.pow(2,index);
        if(highlighted)
            curLightsMask |= lightMask;
        else if((curLightsMask & lightMask) > 0)
            curLightsMask -= lightMask;
        Log.d("ui", "lights mask = " + curLightsMask);
        View lightView = lightFragment.getView();
        if(lightView != null)
            lightView.setVisibility(curLightsMask == 0 ? View.INVISIBLE : View.VISIBLE);
    }

    @Override
    public void onLightPowerChanged(boolean isOn) {
        String curLights = curLights();
        if(curLights != null)
            Light.setLightPower(curLights, isOn ? Light.LIGHT_POWER_ON : Light.LIGHT_POWER_OFF, apiHandler);
    }

    public void onLightColorChanged(int color) {
        String curLights = curLights();
        if(curLights != null)
            Light.setLightColor(curLights, color, apiHandler);
    }

    @Override
    public void onLightColorTemperatureChanged(int colorTemperature) {
        String curLights = curLights();
        if(curLights != null)
            Light.setLightColorTemperature(curLights, colorTemperature, apiHandler);
    }

    @Override
    public void onLightLuminanceChanged(int lum) {
        String curLights = curLights();
        if(curLights != null)
            Light.setLightLuminance(curLights, lum, apiHandler);
    }

    String curLights() {
        if(curLightsMask == 0)
            return null;
        else if(curLightsMask == allLightsMask)
            return "all";
        else {
            int lightIndex = (int) (Math.log(curLightsMask) / Math.log(2));
            if(lightIndex < Light.getLights().size())
                return Light.getLights().get(lightIndex);
            else
                return null;
        }
    }

    protected void setBgColor(int colorId) {
        int color = getResources().getColor(colorId);
        deviceControlView.setBackgroundColor(color);
        actionBarView.setBackgroundColor(color);
    }

    static class LightApiHandler extends Handler {
        @Override
        public void handleMessage(Message msg) {
            super.handleMessage(msg);
            Log.d("light_api", msg.toString());
        }
    }

    LightApiHandler apiHandler = new LightApiHandler();

    @Override
    public void onClick(View view) {
        if(view == actionBarRightIcon) {
            final EditText editText = new EditText(this);
            editText.setText(Light.getServerIp());
            new AlertDialog.Builder(this)
                    .setTitle(R.string.set_ip)
                    .setView(editText)
                    .setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialogInterface, int i) {
                            Light.setServerIp(editText.getText().toString());
                        }
                    })
                    .setNegativeButton(R.string.cancel, null)
                    .show();
        }
    }
}
