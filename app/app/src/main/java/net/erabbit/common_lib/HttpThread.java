package net.erabbit.common_lib;

import android.content.Context;
import android.os.Handler;
import android.util.Log;

import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

import javax.net.ssl.HttpsURLConnection;

/**
 * Created by Tom on 2017/2/8.
 */

public class HttpThread extends Thread {

    static final int HTTP_CONNECTION_TIMEOUT = 3000;
    static final int HTTP_COMMON_DATA_TIMEOUT = 3000;

    private static Context context;
    public static void setApplicationContext(Context _context) {
        context = _context;
    }

    public enum Method {
        AUTO, GET, POST;
    }

    public void setMethod(Method method) {
        this.method = method;
    }

    Method method;
    String url;
    Handler uiHandler;
    int uiMsg;

    Map<String, String> params;

    public HttpThread(String url, Handler uiHandler, int uiMsg) {
        method = Method.AUTO;
        this.url = url;
        this.uiHandler = uiHandler;
        this.uiMsg = uiMsg;
        params = new HashMap<>();
    }

    public void addParam(String key, Object value) {
        params.put(key, String.valueOf(value));
    }

    protected void sendUiMsg(int arg1, int arg2, Object obj) {
        uiHandler.sendMessage(uiHandler.obtainMessage(uiMsg, arg1, arg2, obj));
    }

    private String getFullUrl() {
        String fullUrl = url;
        int paramCount = 0;
        for(Map.Entry<String,String> kv : params.entrySet()) {
            String paramValue = kv.getValue().replace(" ", "%20");
/*			try {
				paramValue = URLEncoder.encode(paramValue, "UTF-8");
			} catch (UnsupportedEncodingException e) {
				e.printStackTrace();
			}*/
            String paramStr = kv.getKey() + "=" + paramValue;
            if(paramCount++ == 0)
                fullUrl += "?";
            else
                fullUrl += "&";
            fullUrl += paramStr;
        }
        return fullUrl;
    }

    @Override
    public void run() {
        //检查请求类型
        if(method == Method.AUTO)
            method = (params.size() > 0) ? Method.POST : Method.GET;

        //HTTP请求的返回信息
        int statusCode = 0;
        boolean done = false;

        InputStream is = null;
        HttpURLConnection conn = null;
        try {
            String requestUrl = (method == Method.GET) ? getFullUrl() : url;
            URL u = new URL(requestUrl);
            conn = (HttpURLConnection)u.openConnection();
            conn.setConnectTimeout(HTTP_CONNECTION_TIMEOUT);
            conn.setReadTimeout(HTTP_COMMON_DATA_TIMEOUT);
            conn.setDoInput(true);
            conn.setRequestMethod(method.toString());
            if(method == Method.POST) {
                Log.i("http thread", "post: " + requestUrl);
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json");
                JSONObject jo = new JSONObject();
                for(Map.Entry<String,String> param : params.entrySet())
                    jo.put(param.getKey(), param.getValue());
                String js = jo.toString();
                conn.setRequestProperty("Content-Length", String.valueOf(js.length()));
                OutputStream os = conn.getOutputStream();
                os.write(js.getBytes("UTF-8"));
            }
            else
                Log.i("http thread", "get: " + requestUrl);
            statusCode = conn.getResponseCode();
            Log.i("http thread", "status code: " + statusCode);
            is = conn.getInputStream();
            if(is != null) {
                parseResponse(statusCode, conn.getContentType(), conn.getContentLength(), is);
            }
            else
                sendUiMsg(statusCode, 0, null);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static final int RESPONSE_BUFFER_LENGTH = 1024;

    private boolean parseResponse(int statusCode, String contentType, int length, InputStream is) {
        if(contentType.equals("application/json")) {
            //string
            try {
                byte[] data = new byte[length];
                int readLength = is.read(data);
                if (readLength != -1) {
                    String responseString = new String(data, 0, readLength, "UTF-8");
                    return parseResponse(statusCode, responseString);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        else if(contentType.startsWith("image/")) {
            //binary
            int pos = url.lastIndexOf("/");
            if(pos > 0) {
                String filename = url.substring(pos + 1);
                try {
                    FileOutputStream fos = context.openFileOutput(filename, Context.MODE_PRIVATE);
                    byte[] data = new byte[RESPONSE_BUFFER_LENGTH];
                    int readLength = 0;
                    do {
                        int len = is.read(data, 0, RESPONSE_BUFFER_LENGTH);
                        if (len > 0) {
                            fos.write(data, 0, len);
                            readLength += len;
                        }
                        else
                            break;
                    }
                    while (readLength < length);
                    fos.close();
                    JSONObject fileInfo = new JSONObject();
                    fileInfo.put("contentType", contentType);
                    fileInfo.put("filename", filename);
                    fileInfo.put("length", length);
                    Log.i("http thread", "saved file: " + fileInfo);
                    sendUiMsg(statusCode, 0, fileInfo);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
        return false;
    }

    protected boolean parseResponse(int statusCode, JSONObject resultObject) {
        sendUiMsg(statusCode, 0, resultObject);
        return true;
    }

    protected boolean parseResponse(int statusCode, String responseString) {
        Log.i("http thread", "response_of<" + url + ">[" + String.valueOf(statusCode) + "]:" + responseString);
        //默认以JSON解析返回信息
        JSONObject resultObject = null;
        try {
            JSONTokener jsonParser = new JSONTokener(responseString);
            resultObject = (JSONObject) jsonParser.nextValue();
        }
        catch(Exception e) {
            e.printStackTrace();
        }
        if(resultObject != null)
            return parseResponse(statusCode, resultObject);
        else {
            sendUiMsg(statusCode, 0, responseString);
            return true;
        }
    }
}
