package net.erabbit.lightingapp;

import android.app.FragmentManager;
import android.app.FragmentTransaction;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.ViewFlipper;

import java.util.ArrayList;

public class MainActivity extends BaseActivity implements LightFragment.OnLightFragmentInteracionListener {

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

    int curLightIndex = -1;
    int curLightsMask = 0;
    int allLightsMask = 0;

    public void onTabSwitched(TabItem tab, boolean highlighted) {
        int index = tabs.indexOf(tab);
        //Log.d("ui", String.format("Light%d %s", index+1, highlighted ? "selected" : "deselected"));
        if(highlighted)
            curLightIndex = index;
        int lightMask = (int)Math.pow(2,index);
        if(highlighted)
            curLightsMask |= lightMask;
        else if((curLightsMask & lightMask) > 0)
            curLightsMask -= lightMask;
        Log.d("ui", "lights mask = " + curLightsMask);
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

    String curLights() {
        if(curLightIndex < 0)
            return null;
        else
            return (curLightsMask == allLightsMask) ? "all" : Light.getLights().get(curLightIndex);
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
}
