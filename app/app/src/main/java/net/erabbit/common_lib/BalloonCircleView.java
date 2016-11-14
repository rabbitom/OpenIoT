package net.erabbit.common_lib;

import android.content.Context;
import android.content.res.TypedArray;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.util.AttributeSet;

import net.erabbit.lightingapp.R;

/**
 * Created by Tom on 2015/9/16.
 */
public class BalloonCircleView extends CircleView {

    protected float balloonHeight;
    protected Paint fillPaint;
    protected float pointOffsetAngle;
    protected float pointAngle = (float)Math.PI / 2;

    public BalloonCircleView(Context context, AttributeSet attrs) {
        super(context, attrs);
        TypedArray array = context.obtainStyledAttributes(attrs, R.styleable.BalloonCircleView);
        balloonHeight = array.getDimension(R.styleable.BalloonCircleView_balloon_height, 8f);
        array.recycle();
        center.x += balloonHeight;
        center.y += balloonHeight;
        fillPaint = new Paint(strokePaint);
        fillPaint.setStyle(Paint.Style.FILL);
        pointOffsetAngle = (float)Math.asin(balloonHeight / 2 / radius);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        Path pointTrianglePath = pointTrianglePath(radius + strokeWidth / 2 + balloonHeight, pointAngle, radius + strokeWidth / 2, pointOffsetAngle);
        canvas.drawPath(pointTrianglePath, fillPaint);
    }

}
