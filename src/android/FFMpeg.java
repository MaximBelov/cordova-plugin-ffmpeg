package com.marin.plugin;

import android.util.Log;

import org.apache.cordova.*;
import org.json.JSONArray;
import org.json.JSONException;

import com.arthenica.ffmpegkit.FFmpegKit;
import com.arthenica.ffmpegkit.FFmpegSession;
import com.arthenica.ffmpegkit.FFmpegSessionCompleteCallback;
import com.arthenica.ffmpegkit.FFprobeKit;
import com.arthenica.ffmpegkit.MediaInformationSession;
import com.arthenica.ffmpegkit.ReturnCode;

public class FFMpeg extends CordovaPlugin {
    private static final String TAG = "FFMpegPlugin";

    @Override
    public boolean execute(String action, JSONArray data, CallbackContext callbackContext) throws JSONException {
        if (action.equals("exec")) {
          FFmpegKit.executeAsync(data.getString(0), new FFmpegSessionCompleteCallback() {
            @Override
            public void apply(FFmpegSession session) {
              Log.d(TAG, String.format("FFmpeg process exited with state %s and rc %s.%s", session.getState(), session.getReturnCode(), notNull(session.getFailStackTrace())));
              if (ReturnCode.isSuccess(session.getReturnCode())) {
                callbackContext.success();
              } else {
                callbackContext.error("Error Code: " + session.getReturnCode());
              }
            }
            });
            return true;
        } else if(action.equals("probe")) {
            MediaInformationSession mediaInformationSession = FFprobeKit.getMediaInformation(data.getString(0));
            ReturnCode returnCode = mediaInformationSession.getReturnCode();

            if(ReturnCode.isSuccess(returnCode)) {
                callbackContext.success(mediaInformationSession.getMediaInformation().getAllProperties());
            } else {
                callbackContext.error(notNull(mediaInformationSession.getFailStackTrace()));
            }
            return true;
        } else return false;
    }

  static String notNull(final String string) {
    return (string == null) ? "" : String.format("%s%s", "\n", string);
  }
}
