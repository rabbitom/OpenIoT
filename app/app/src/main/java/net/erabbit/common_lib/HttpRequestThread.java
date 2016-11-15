package net.erabbit.common_lib;

import java.io.File;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.HttpVersion;
import org.apache.http.NameValuePair;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpPut;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.conn.ClientConnectionManager;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.impl.conn.tsccm.ThreadSafeClientConnManager;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.HttpConnectionParams;
import org.apache.http.params.HttpParams;
import org.apache.http.params.HttpProtocolParams;
import org.apache.http.protocol.HTTP;
import org.apache.http.util.EntityUtils;
import org.json.JSONObject;
import org.json.JSONTokener;

import android.os.Handler;
import android.util.Log;

import java.io.IOException;
import java.net.Socket;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import org.apache.http.conn.scheme.PlainSocketFactory;
import org.apache.http.conn.scheme.Scheme;
import org.apache.http.conn.scheme.SchemeRegistry;
import org.apache.http.conn.ssl.SSLSocketFactory;

public class HttpRequestThread extends Thread {
	
	public static class MySSLSocketFactory extends SSLSocketFactory {
        SSLContext sslContext = SSLContext.getInstance("TLS");

        public MySSLSocketFactory(KeyStore truststore) throws NoSuchAlgorithmException,
                KeyManagementException, KeyStoreException, UnrecoverableKeyException {
            super(truststore);

            TrustManager tm = new X509TrustManager() {
                public void checkClientTrusted(X509Certificate[] chain, String authType)
                        throws CertificateException {
                }

                public void checkServerTrusted(X509Certificate[] chain, String authType)
                        throws CertificateException {
                }

                public X509Certificate[] getAcceptedIssuers() {
                    return null;
                }
            };

            sslContext.init(null, new TrustManager[] { tm }, null);
        }

        @Override
        public Socket createSocket(Socket socket, String host, int port, boolean autoClose)
                throws IOException, UnknownHostException {
            return sslContext.getSocketFactory().createSocket(socket, host, port, autoClose);
        }

        @Override
        public Socket createSocket() throws IOException {
            return sslContext.getSocketFactory().createSocket();
        }
    }
	
	protected static final int HTTP_CONNECTION_TIMEOUT 	= 3000;
	protected static final int HTTP_COMMON_DATA_TIMEOUT = 3000;
	protected static final int HTTP_LONG_DATA_TIMEOUT 	= 35000;
	
	public static HttpClient NewHttpsClient(int soTimeout) {
        try {
            KeyStore trustStore = KeyStore.getInstance(KeyStore.getDefaultType());
            trustStore.load(null, null);

            SSLSocketFactory sf = new MySSLSocketFactory(trustStore);
            sf.setHostnameVerifier(SSLSocketFactory.ALLOW_ALL_HOSTNAME_VERIFIER);

            HttpParams params = new BasicHttpParams();
            HttpConnectionParams.setConnectionTimeout(params, HTTP_CONNECTION_TIMEOUT);
            HttpConnectionParams.setSoTimeout(params, soTimeout);
            HttpProtocolParams.setVersion(params, HttpVersion.HTTP_1_1);
            HttpProtocolParams.setContentCharset(params, HTTP.UTF_8);

            SchemeRegistry registry = new SchemeRegistry();
            registry.register(new Scheme("http", PlainSocketFactory.getSocketFactory(), 80));
            registry.register(new Scheme("https", sf, 443));

            ClientConnectionManager ccm = new ThreadSafeClientConnManager(params, registry);
            HttpClient client = new DefaultHttpClient(ccm, params);
            return client;
        } catch (Exception e) {
            return new DefaultHttpClient();
        }
    }
	
	//HTTP请求方法
	public static final int AUTO = 0;
	public static final int GET = 1;
	public static final int POST = 2;
	public static final int PUT =3;
	public static final int DELETE = 4;
	
	//返回信息内容
	public static final int RESULT_TYPE_STRING = 0;
	public static final int RESULT_TYPE_JSON = 1;
	
	//构造函数
	public HttpRequestThread() {
		method = AUTO;
	}
	public HttpRequestThread(int requestMethod) {
		method = requestMethod;
	}
	public HttpRequestThread(String url, Handler uiHandler, int uiMsg) {
		method = AUTO;
		this.url = url;
		this.uiHandler = uiHandler;
		this.uiMsg = uiMsg;
	}
	
	//属性
	public int method;
	public String url;
	public Handler uiHandler;
	public int uiMsg;
	
	protected int dataTimeout = HTTP_COMMON_DATA_TIMEOUT;
	public void setLongTimeout() {
		dataTimeout = HTTP_LONG_DATA_TIMEOUT;
	}
	
	//私有变量
	protected List<NameValuePair> params = new ArrayList<NameValuePair>();
	protected Map<String,File> files = new HashMap<String,File>();
	protected Map<String,String> headers = new HashMap<String,String>();
	
	//方法
	public void addParam(String key, String value) {
		params.add(new BasicNameValuePair(key, value));
	}
	public void encodeParam(String key, String value) {
		String encodedValue = null;
		try {
			encodedValue = URLEncoder.encode(value,"UTF-8");
		}
		catch(UnsupportedEncodingException e) {
			e.printStackTrace();
		}
		if(encodedValue != null) {
			Log.i("http_encode_param", value + " " + encodedValue);
			addParam(key, encodedValue);
		}
		else {
			Log.i("http_encode_param_fail", value);
			addParam(key, value);
		}
	}
	public void addParam(String key, int value) {
		params.add(new BasicNameValuePair(key, String.format("%d", value)));
	}
	public void addFile(String key, File file) {
		files.put(key, file);
	}
	public void addHeader(String key, String value) {
		headers.put(key, value);
	}
	
	//GET方式的URL
	public String GetFullUrl() {
		String fullUrl = url;
		int paramCount = params.size();
		for(int i=0; i<paramCount; i++) {
			NameValuePair param = params.get(i);
			String paramStr = param.getName() + "=" + param.getValue();
			if(i == 0)
				fullUrl += "?";
			else
				fullUrl += "&";
			fullUrl += paramStr;
		}
		return fullUrl;
	}
	
	protected void sendUiMsg(int arg1, int arg2, Object obj) {
		uiHandler.sendMessage(uiHandler.obtainMessage(uiMsg, arg1, arg2, obj));
	}
	
	//线程函数
	public void run() {
		//检查请求类型
		if(method == AUTO)
			method = ((files.size() > 0) || (params.size() > 0)) ? POST : GET;
		
		//HTTP请求的返回信息
		int statusCode = 0;
		boolean done = false;
		
		//依据请求类型提交请求
		if((method == POST) && (files.size() > 0)){
			//以表单格式POST(multipart/form-data)
//			FormUploader fu = new FormUploader();
//			statusCode = fu.post(url, params, files);
//			if(statusCode > 0)
//				done = parseResponse(statusCode, fu.GetResponseString());
		}
		else {
			HttpClient client;
			if(url.startsWith("https"))
				client = NewHttpsClient(dataTimeout);
			else {
				client = new DefaultHttpClient();
				HttpConnectionParams.setConnectionTimeout(client.getParams(), HTTP_CONNECTION_TIMEOUT);
				HttpConnectionParams.setSoTimeout(client.getParams(), dataTimeout);
			}
			HttpUriRequest request = null;
			try {
				//构造请求
				if(method == GET) {
					String fullUrl = GetFullUrl();
					Log.i("http_get_full_url", fullUrl);
					request = new HttpGet(fullUrl);
				}
				else if(method == POST){
					//以UrlEncode格式POST(application/x-www-form-urlencoded)
					Log.i("http_post_url", url);
					Log.i("http_post_param", params.toString());
					HttpEntity entity = new UrlEncodedFormEntity(params, HTTP.UTF_8);
					HttpPost post = new HttpPost(url);
					post.setEntity(entity);
					request = post;
				}
				else if(method == PUT) {
					Log.i("http_put_url", url);
					Log.i("http_put_param", params.toString());
					HttpEntity entity = new UrlEncodedFormEntity(params, HTTP.UTF_8);
					HttpPut put = new HttpPut(url);
					put.setEntity(entity);
					request = put;
				}
				else if(method == DELETE) {
					String fullUrl = GetFullUrl();
					Log.i("http_delete_full_url", fullUrl);
					HttpDelete delete = new HttpDelete(fullUrl);
					request = delete;
				}
				//请求头信息
				for(Map.Entry<String,String> entry : headers.entrySet()) {
					request.addHeader(entry.getKey(), entry.getValue());
				}
				//执行请求
				HttpResponse response = client.execute(request);
				//返回信息
				statusCode = response.getStatusLine().getStatusCode();
				String contentType = response.getEntity().getContentType().getValue();
				Log.i("http_content_type", contentType);
				if(contentType.equals("application/json"))
					done = parseResponse(statusCode, EntityUtils.toString(response.getEntity(), "UTF-8"));
				else
					done = parseResponse(statusCode, response.getEntity().getContent());
			}
			catch(Exception e) {
				e.printStackTrace();
			}
		}
		
		if(!done)
			sendUiMsg(statusCode, 0, null);
	}
	
	protected boolean parseResponse(int statusCode, InputStream is) {
		//to override
		return false;
	}
	
	protected boolean parseResponse(int statusCode, JSONObject resultObject) {
		sendUiMsg(statusCode, 0, resultObject);
		return true;
	}
	
	protected boolean parseResponse(int statusCode, String responseString) {
		Log.i("http_response", "response_of<" + url + ">[" + String.valueOf(statusCode) + "]:" + responseString);
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
