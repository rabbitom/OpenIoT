package net.erabbit.common_lib;

import java.util.ArrayList;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import net.erabbit.lightingapp.R;

public class TabManager implements View.OnClickListener {
	
	public interface OnActiveTabChangedListener {
		public void OnActiveTabChanged(int index);
	}
	
	protected Activity baseActivity;
	
	protected OnActiveTabChangedListener onActiveTabChangedListener;	
	
	ArrayList<TextView> tabs = new ArrayList<TextView>();
    ArrayList<Drawable> normalIcons;
    ArrayList<Drawable> hilightIcons;
	
    protected int activeTabIndex;
    
	protected int normalTextColor;
    protected int hilightTextColor;
    
    protected float textSize = 18;
    protected boolean showUnderLine = true;
    
    protected int tabWidth = 0;
    protected int lineHeight = 5;
    protected int text_line_gap = 20;
    
	public TabManager(Activity activity) {
		baseActivity = activity;
		normalTextColor = Color.GRAY;
        hilightTextColor = Color.WHITE;
	}
	
	public void setOnActiveTabChangedListener(OnActiveTabChangedListener listener) {
		onActiveTabChangedListener = listener;
	}

	public void setTextColor(int normalColor, int hilightColor) {
    	normalTextColor = normalColor;
    	hilightTextColor = hilightColor;
    }

    public void setTextSize(float newSize) {
    	textSize = newSize;
    }
    
    public void setShowUnderLine(boolean willShow) {
    	showUnderLine = willShow;
    }
    
	public void setActiveTab(int index) {
		activeTabIndex = index;
		for(int i=0; i<tabs.size(); i++) {
			TextView tab = tabs.get(i);
			tab.setTextColor((i == index) ? hilightTextColor : normalTextColor);
			if(showUnderLine) {
/*				Drawable line = baseActivity.getResources().getDrawable((i == index) ? R.drawable.rect_cyan : R.drawable.rect_grey);
				line.setBounds(0, 0, tabWidth, lineHeight);
		    	tab.setCompoundDrawablesRelative(null, null, null, line);
		    	tab.setCompoundDrawablePadding(text_line_gap);*/
			}
			else if(normalIcons != null) {
				Drawable icon = ((i == index) && (hilightIcons != null)) ? hilightIcons.get(i) : normalIcons.get(i);
				if(icon != null)
					tab.setCompoundDrawables(null, icon, null, null);
			}
		}
	}
	
	public void setTabs(int holderId, String[] titles) {
		LayoutInflater inflater = baseActivity.getLayoutInflater();
		LinearLayout tabsHolder = (LinearLayout)baseActivity.findViewById(holderId);
		tabs.clear();
		for(String title : titles) {
			TextView tab = (TextView)inflater.inflate(R.layout.tab, tabsHolder, false);
			tab.setText(title);
			tab.setTextSize(textSize);
			tabsHolder.addView(tab);
 			tab.setOnClickListener(this);
 			tab.setId(tabs.size());//TAB
 			tabs.add(tab);
		}
		if(tabs.size() > 0) {
			tabWidth = baseActivity.getResources().getDisplayMetrics().widthPixels / tabs.size();
			setActiveTab(0);
		}
	}
	
	public void setTabIconNormal(int iconIds[]) {
		if(normalIcons == null)
			normalIcons = new ArrayList<Drawable>();
		else
			normalIcons.clear();
		addIcons(normalIcons, iconIds);
	}
	
	public void setTabIconHilight(int iconIds[]) {
		if(hilightIcons == null)
			hilightIcons = new ArrayList<Drawable>();
		else
			hilightIcons.clear();
		addIcons(hilightIcons, iconIds);
	}
	
	protected void addIcons(ArrayList<Drawable> icons, int iconIds[]) {
		for(int iconId : iconIds) {
			Drawable icon = baseActivity.getResources().getDrawable(iconId);
			icon.setBounds(0, 0, icon.getIntrinsicWidth(), icon.getIntrinsicHeight());
			icons.add(icon);
		}
	}
	
	@Override
	public void onClick(View v) {
		int index = v.getId();
		if(index != activeTabIndex) {
			setActiveTab(index);
			if(onActiveTabChangedListener != null)
				onActiveTabChangedListener.OnActiveTabChanged(index);
		}
	}
};