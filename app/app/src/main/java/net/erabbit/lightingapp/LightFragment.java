package net.erabbit.lightingapp;

import android.app.Activity;
import android.app.Fragment;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.RadioButton;
import android.widget.RadioGroup;

import net.erabbit.common_lib.ColorPlateCircleView;

import java.util.ArrayList;


/**
 * A simple {@link Fragment} subclass.
 */
public class LightFragment extends Fragment
implements CheckBox.OnCheckedChangeListener, ColorPlateCircleView.OnColorPlateChangedListener, RadioGroup.OnCheckedChangeListener {

//    protected static final int VIEW_COLOR_PLATE = 0;
//    protected static final int VIEW_COLOR_FLOW = 1;
    protected View colorCirclesView;
    protected View lightModeCheckView;
    protected CheckBox lightModeCheck;
    protected RadioGroup lightModeSelector;
    protected RadioButton lightModeNormal;
    protected RadioButton lightModeAlternate;
    //protected ViewFlipper colorViews;
    protected ColorPlateCircleView colorPlateView;
    //protected ColorFlowCircleView colorFlowView;
    protected CheckBox lightSwitch;

    public interface OnLightFragmentInteracionListener {
        void onLightPowerChanged(boolean isOn);
        void onLightColorChanged(int color);
        void onLightColorTemperatureChanged(int colorTemperature);
        void onLightLuminanceChanged(int lum);
    }

    protected OnLightFragmentInteracionListener mListener;

    protected static final String LIGHT_COLORS = "LightColors";
    protected ArrayList<Integer> mLightColors;

    public static LightFragment newInstance(ArrayList<Integer> lightColors) {
        LightFragment fragment = new LightFragment();
        Bundle args = new Bundle();
        args.putIntegerArrayList(LIGHT_COLORS, lightColors);
        fragment.setArguments(args);
        return fragment;
    }

    public LightFragment() {
        // Required empty public constructor
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Bundle arguments = getArguments();
        if (arguments != null) {
            mLightColors = arguments.getIntegerArrayList(LIGHT_COLORS);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        View view = inflater.inflate(R.layout.fragment_light, container, false);
        colorPlateView = (ColorPlateCircleView)view.findViewById(R.id.colorPlateView);
        colorPlateView.setOnColorPlateChangedListener(this);
        //colorFlowView = (ColorFlowCircleView)view.findViewById(R.id.colorFlowView);
        lightModeCheck = (CheckBox)view.findViewById(R.id.lightModeCheck);
        lightModeCheck.setOnCheckedChangeListener(this);
        //colorViews = (ViewFlipper)view.findViewById(R.id.colorViews);
        colorCirclesView = view.findViewById(R.id.colorCirclesView);
        lightModeCheckView = view.findViewById(R.id.lightModeCheckView);
        lightModeSelector = (RadioGroup)view.findViewById(R.id.lightModeSelector);
        lightModeSelector.setOnCheckedChangeListener(this);
        lightModeNormal = (RadioButton)view.findViewById(R.id.lightModeNormal);
        lightModeAlternate = (RadioButton)view.findViewById(R.id.lightModeAlternate);
        lightSwitch = (CheckBox)view.findViewById(R.id.lightSwitch);
        lightSwitch.setOnCheckedChangeListener(this);
        if(mLightColors != null)
            colorPlateView.setColors(mLightColors);
        return view;
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        view.setVisibility(View.INVISIBLE);
    }

    @Override
    public void onAttach(Activity activity) {
        super.onAttach(activity);
        try {
            mListener = (OnLightFragmentInteracionListener) activity;
        } catch (ClassCastException e) {
            throw new ClassCastException(activity.toString()
                    + " must implement OnLightFragmentInteractionListener");
        }
    }

    @Override
    public void onCheckedChanged(CompoundButton compoundButton, boolean checked) {
        if(compoundButton == lightModeCheck) {
//            colorFlowView.setFlow(checked);
//            if(checked)
//                colorViews.setDisplayedChild(VIEW_COLOR_FLOW);
//            else
//                colorViews.setDisplayedChild(VIEW_COLOR_PLATE);
            if(mListener != null)
                mListener.onLightLuminanceChanged(checked ? Light.LIGHT_LUMINANCE_FULL : Light.LIGHT_LUMINANCE_HALF);
        }
        else if(compoundButton == lightSwitch) {
            if(checked) {
                colorCirclesView.setVisibility(View.VISIBLE);
                lightModeCheckView.setVisibility(View.VISIBLE);
                lightModeSelector.setVisibility(View.VISIBLE);
//                if(lightModeNormal.isChecked())
//                    colorFlowView.setFlow(true);
            }
            else {
                colorCirclesView.setVisibility(View.INVISIBLE);
                lightModeCheckView.setVisibility(View.INVISIBLE);
                lightModeSelector.setVisibility(View.INVISIBLE);
//                colorFlowView.setFlow(false);
            }
            if(mListener != null)
                mListener.onLightPowerChanged(checked);
        }
    }

    @Override
    public void onCheckedChanged(RadioGroup radioGroup, int i) {
        if(radioGroup == lightModeSelector) {
            if(mListener != null)
                mListener.onLightColorTemperatureChanged(lightModeNormal.isChecked() ? Light.LIGHT_COLOR_TEMPERATURE_COLD : Light.LIGHT_COLOR_TEMPERATURE_WARM);
        }
    }

    @Override
    public void onColorPlateChanged() {
        if(mListener != null)
            mListener.onLightColorChanged(colorPlateView.getColor());
    }
}
