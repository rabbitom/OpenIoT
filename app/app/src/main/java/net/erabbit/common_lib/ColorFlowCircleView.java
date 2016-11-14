package net.erabbit.common_lib;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.SweepGradient;
import android.util.AttributeSet;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;

import net.erabbit.common_lib.CircleView;

/**
 * Created by Tom on 2015/9/16.
 */
public class ColorFlowCircleView extends CircleView {

    protected int colorFlowTimeSeconds = 90;
    protected RotateAnimation rotate;

    public ColorFlowCircleView(Context context, AttributeSet attrs) {
        super(context, attrs);
        //Color.WHITE, Color.MAGENTA, Color.BLUE, Color.CYAN, Color.GREEN, Color.YELLOW, Color.RED, Color.WHITE
        SweepGradient sg = new SweepGradient(center.x, center.y, new int[]{Color.WHITE, Color.RED, Color.YELLOW, Color.GREEN, Color.CYAN, Color.BLUE, Color.MAGENTA, Color.WHITE}, null);
        strokePaint.setShader(sg);
        rotate = new RotateAnimation(0f, -360f, Animation.ABSOLUTE, center.x, Animation.ABSOLUTE, center.y);
        rotate.setDuration(colorFlowTimeSeconds * 1000);
        rotate.setRepeatCount(Animation.INFINITE);
        rotate.setInterpolator(context, android.R.interpolator.linear);
    }

    public void setFlow(boolean flow) {
        if(rotate != null) {
            if (flow)
                startAnimation(rotate);
            else
                clearAnimation();
        }
    }

    @Override
    protected void onDraw(Canvas canvas) {
        canvas.rotate(-90f, center.x, center.y);
        super.onDraw(canvas);
        canvas.restore();
    }
}
