package net.erabbit.lightingapp;

import android.app.ActionBar;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;

/**
 * Created by Tom on 2015/9/14.
 */
public class BaseActivity extends Activity {

    protected ActionBar actionBar;
    protected View actionBarView;
    protected TextView actionBarTitle;
    protected ImageView actionBarLeftIcon;
    protected ImageView actionBarRightIcon;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        actionBar = getActionBar();
        if(actionBar != null) {
            actionBar.setDisplayShowHomeEnabled(false);
            actionBar.setDisplayShowTitleEnabled(false);
            actionBar.setDisplayShowCustomEnabled(true);
            actionBar.setCustomView(R.layout.action_bar);
            actionBarView = actionBar.getCustomView();
            actionBarTitle = (TextView)actionBarView.findViewById(R.id.title);
            //actionBarTitle.setText(getTitle());
/*
            actionBarLeftIcon = (ImageView)actionBarView.findViewById(R.id.leftIcon);
            actionBarLeftIcon.setImageResource(R.drawable.menu);
            actionBarRightIcon = (ImageView)actionBarView.findViewById(R.id.rightIcon);
            actionBarRightIcon.setImageResource(R.drawable.settings);
*/
        }
    }

    @Override
    public void setTitle(int titleId) {
        super.setTitle(titleId);
        //myTitle = getString(titleId);
        actionBarTitle.setText(getString(titleId));
    }

    @Override
    public void setTitle(CharSequence title) {
        super.setTitle(title);
        //myTitle = (String) title;
        actionBarTitle.setText(title);
    }
}
