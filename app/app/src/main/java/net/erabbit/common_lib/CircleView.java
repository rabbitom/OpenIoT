package net.erabbit.common_lib;

import android.content.Context;
import android.content.res.TypedArray;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PointF;
import android.util.AttributeSet;
import android.view.View;

import net.erabbit.lightingapp.R;

/**
 * Created by Tom on 2015/9/16.
 */
public class CircleView extends View {

    protected float radius;
    protected PointF center;
    protected float strokeWidth;
    protected Paint strokePaint;

    public CircleView(Context context, AttributeSet attrs) {
        super(context, attrs);
        TypedArray array = context.obtainStyledAttributes(attrs, R.styleable.CircleView);
        float diameter = array.getDimensionPixelSize(R.styleable.CircleView_diameter, 100);
        int color = array.getColor(R.styleable.CircleView_stroke_color, Color.WHITE);
        strokeWidth = array.getDimensionPixelSize(R.styleable.CircleView_stroke_width, 10);
        array.recycle();
        radius = diameter / 2 - strokeWidth / 2;
        center = new PointF(diameter / 2, diameter / 2);
        strokePaint = new Paint();
        strokePaint.setColor(color);
        strokePaint.setStrokeWidth(strokeWidth);
        strokePaint.setAntiAlias(true);
        strokePaint.setStyle(Paint.Style.STROKE);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        canvas.drawCircle(center.x, center.y, radius, strokePaint);
    }

    protected Path pointTrianglePath(float pointingRadius, float pointingAngle, float baseRadius, float offsetAngle) {
        Path path = new Path();
        path.moveTo(center.x + pointingRadius * (float) Math.cos(pointingAngle), center.y - pointingRadius * (float) Math.sin(pointingAngle));
        path.lineTo(center.x + baseRadius * (float) Math.cos(pointingAngle - offsetAngle), center.y - baseRadius * (float) Math.sin(pointingAngle - offsetAngle));
        path.lineTo(center.x + baseRadius * (float) Math.cos(pointingAngle + offsetAngle), center.y - baseRadius * (float) Math.sin(pointingAngle + offsetAngle));
        path.close();
        return path;
    }

}
