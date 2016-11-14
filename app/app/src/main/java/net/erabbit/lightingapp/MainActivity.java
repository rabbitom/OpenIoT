package net.erabbit.lightingapp;

import android.app.FragmentManager;
import android.app.FragmentTransaction;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.ViewFlipper;

import java.util.ArrayList;

public class MainActivity extends BaseActivity implements LightFragment.OnLightFragmentInteracionListener, View.OnClickListener {

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

    public void onTabSwitched(TabItem tab, boolean highlighted) {
        int index = tabs.indexOf(tab);
        Log.d("ui", String.format("Light%d %s", index+1, highlighted ? "selected" : "deselected"));
    }

    @Override
    public void onClick(View view) {

    }

    @Override
    public void onLightModeChanged() {
//        DituoAromaDiffuser.Light light = lightFragment.getLightMode();
//        if((aromaDiffuser.getLight() == DituoAromaDiffuser.Light.COLOR_FLOW_ON) && (light != DituoAromaDiffuser.Light.COLOR_FLOW_ON))
//            aromaDiffuser.setLight(DituoAromaDiffuser.Light.COLOR_FLOW_OFF);
//        aromaDiffuser.setLight(light);
    }

    protected void setBgColor(int colorId) {
        int color = getResources().getColor(colorId);
        deviceControlView.setBackgroundColor(color);
        actionBarView.setBackgroundColor(color);
    }

}
