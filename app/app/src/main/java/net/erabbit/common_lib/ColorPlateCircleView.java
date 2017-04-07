package net.erabbit.common_lib;

import android.content.Context;
import android.content.res.TypedArray;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PointF;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;

import net.erabbit.lightingapp.R;

import java.util.ArrayList;

/**
 * Created by Tom on 2015/9/16.
 */
public class ColorPlateCircleView extends View {

    protected float diameter;
    protected float circleWidth;

    protected Paint paint;

    protected float initAngle = -90f;
    protected float beginTouchAngle, beginInitAngle;
    protected boolean colorHasChanged = false;

    protected static final int defaultColor = Color.WHITE;
    protected ArrayList<Integer> colors;
    public int colorCount() {
        return (colors == null) ? 0 : colors.size();
    }
    public ArrayList<Integer> getColors() {
        return colors;
    }
    public void setColors(ArrayList<Integer> colors) {
        this.colors = colors;
        invalidate();
    }

    protected int curColor = defaultColor;

    public void setColor(int color) {
        int colorCount = colorCount();
        if((colorCount > 0) && colors.contains(color)) {
            curColor = color;
            int colorIndex = colors.indexOf(color);
            initAngle = -90f - 360f / colorCount * colorIndex;
            invalidate();
        }
    }

    public int getColor() {
        return getColorAt(initAngle);
    }

    public int getColorAt(float angle) {
        int colorCount = colorCount();
        if(colorCount > 0) {
            float offsetAngle = -90f - angle;
            while(offsetAngle < 0)
                offsetAngle += 360f;
            float offsetCount = offsetAngle / (360f / colorCount);
            int colorIndex = 0;
            if(offsetCount > 0.5f)
                colorIndex = ((int)(offsetCount - 0.5f) + 1) % colorCount;
            return colors.get(colorIndex);
        }
        else
            return defaultColor;
    }

    public interface OnColorPlateChangedListener {
        public void onColorPlateChanged();
    }

    protected OnColorPlateChangedListener onColorPlateChangedListener;

    public void setOnColorPlateChangedListener(OnColorPlateChangedListener listener) {
        onColorPlateChangedListener = listener;
    }

    public ColorPlateCircleView(Context context, AttributeSet attrs) {
        super(context, attrs);
        TypedArray array = context.obtainStyledAttributes(attrs, R.styleable.CircleView);
        diameter = array.getDimension(R.styleable.CircleView_diameter, 250);
        circleWidth = array.getDimension(R.styleable.CircleView_stroke_width, 50);
        array.recycle();
        paint = new Paint();
        paint.setAntiAlias(true);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        int colorCount = colorCount();
        if(colorCount == 0) {
            paint.setStrokeWidth(circleWidth);
            paint.setStyle(Paint.Style.STROKE);
            paint.setColor(defaultColor);
            Path path = new Path();
            path.addCircle(diameter/2, diameter/2, diameter/2 - circleWidth/2, Path.Direction.CW);
            canvas.drawPath(path, paint);
        }
        else {
            RectF outerRect = new RectF(0f, 0f, diameter, diameter);
            RectF innerRect = new RectF(circleWidth, circleWidth, diameter - circleWidth, diameter - circleWidth);
            float baseAngle = 360f / colorCount;
            float startAngle = initAngle - baseAngle / 2;
            paint.setStrokeWidth(0.1f);
            paint.setStyle(Paint.Style.FILL_AND_STROKE);
            for(int color : colors) {
                Path path = new Path();
                paint.setColor(color);
                path.arcTo(outerRect, startAngle, baseAngle);
                path.arcTo(innerRect, startAngle + baseAngle, -baseAngle);
                path.close();
                canvas.drawPath(path, paint);
                startAngle += baseAngle;
            }
        }
    }

    protected float[] calcRaiusAngle(MotionEvent me, PointF center) {
        MotionEvent.PointerCoords pt = new MotionEvent.PointerCoords();
        me.getPointerCoords(0, pt);
        float x = pt.x - center.x;
        float y = center.y - pt.y;
        float r = (float)Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
        float a = (float) Math.toDegrees(Math.asin(Math.abs(y / r)));
        /*if((x>=0) && (y>=0))
            a = a;
        else*/
        if ((x >= 0) && (y < 0))
            a = 360 - a;
        else if ((x < 0) && (y >= 0))
            a = 180 - a;
        else if ((x < 0) && (y < 0))
            a = 180 + a;
        return new float[]{r, 360 - a};
    }

    protected float normalizedAngle(float a) {
        while(a < 0)
            a += 360;
        while(a >= 360)
            a -= 360;
        return a;
    }

    protected float angleDistance(float a, float b) {
        float d = normalizedAngle(a - b);
        return (d > 180) ? (360 - d) : d;
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        float[] ra = calcRaiusAngle(event, new PointF(diameter/2, diameter/2));
        float radius = ra[0];
        float angle = ra[1];
        if(event.getAction() == MotionEvent.ACTION_DOWN) {
            if(radius > diameter / 2 - circleWidth) {
                beginTouchAngle = angle;
                beginInitAngle = initAngle;
                colorHasChanged = false;
                return true;
            }
            else
                return false;
        }
        else if(event.getAction() == MotionEvent.ACTION_MOVE) {
            initAngle = beginInitAngle + (angle - beginTouchAngle);
            invalidate();
            int newColor = getColor();
            if(newColor != curColor) {
                curColor = newColor;
                colorHasChanged = false;
                if(onColorPlateChangedListener != null)
                    onColorPlateChangedListener.onColorPlateChanged();
            }
            return true;
        }
        else if(event.getAction() == MotionEvent.ACTION_UP) {
            //单击动作
            if((!colorHasChanged) && (angleDistance(angle, beginTouchAngle) < 10)) {
                int newColor = getColorAt(initAngle + (-90f - beginTouchAngle));
                if(newColor != curColor) {
                    setColor(newColor);
                    if(onColorPlateChangedListener != null)
                        onColorPlateChangedListener.onColorPlateChanged();
                }
            }
        }
        return super.onTouchEvent(event);
    }
}
