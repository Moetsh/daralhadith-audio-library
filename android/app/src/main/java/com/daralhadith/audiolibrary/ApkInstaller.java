package com.daralhadith.audiolibrary;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstaller extends Plugin {

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Missing path");
            return;
        }
        try {
            File file = new File(path);
            if (!file.exists()) {
                call.reject("File not found: " + path);
                return;
            }
            launchInstall(call, file);
        } catch (Exception e) {
            call.reject("Install failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        boolean can = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
            || getContext().getPackageManager().canRequestPackageInstalls();
        JSObject ret = new JSObject();
        ret.put("can", can);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing url");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls()) {
            call.reject("INSTALL_PERMISSION_REQUIRED");
            return;
        }

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                File cacheDir = getContext().getCacheDir();
                File apkFile = new File(cacheDir, "update.apk");
                if (apkFile.exists()) apkFile.delete();

                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(60000);
                conn.setInstanceFollowRedirects(true);
                conn.connect();

                int code = conn.getResponseCode();
                if (code != 200) {
                    call.reject("HTTP " + code);
                    return;
                }

                long fullTotal = conn.getContentLengthLong();
                InputStream in = conn.getInputStream();
                FileOutputStream out = new FileOutputStream(apkFile, false);
                byte[] buf = new byte[8192];
                int read;
                long bytes = 0;
                int lastPct = 0;
                while ((read = in.read(buf)) > 0) {
                    out.write(buf, 0, read);
                    bytes += read;
                    if (fullTotal > 0) {
                        int pct = (int) (bytes * 100L / fullTotal);
                        if (pct > lastPct) {
                            lastPct = pct;
                            JSObject ev = new JSObject();
                            ev.put("percent", pct);
                            notifyListeners("downloadProgress", ev);
                        }
                    }
                }
                out.flush();
                out.close();
                in.close();
                conn.disconnect();
                conn = null;

                if (!apkFile.exists() || apkFile.length() == 0) {
                    call.reject("Empty file");
                    return;
                }

                try {
                    apkFile.setReadable(true, false);
                    apkFile.setExecutable(false, false);
                    apkFile.setWritable(false, false);
                } catch (Exception ignored) {}

                Uri uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apkFile
                );
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(uri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK);
                getContext().startActivity(intent);

                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) {
                if (conn != null) conn.disconnect();
                try {
                    File cacheDir = getContext().getCacheDir();
                    File apkFile = new File(cacheDir, "update.apk");
                    if (apkFile.exists()) apkFile.delete();
                } catch (Exception ignored) {}
                call.reject(e.getMessage());
            }
        }).start();
    }

    private void launchInstall(PluginCall call, File file) {
        try {
            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Install failed: " + e.getMessage());
        }
    }
}
