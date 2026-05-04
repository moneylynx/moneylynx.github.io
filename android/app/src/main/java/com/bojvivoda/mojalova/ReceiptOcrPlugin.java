package com.bojvivoda.mojalova;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

@CapacitorPlugin(name = "ReceiptOcr")
public class ReceiptOcrPlugin extends Plugin {
    @PluginMethod
    public void recognize(PluginCall call) {
        String dataUrl = call.getString("dataUrl", "");
        if (dataUrl == null || dataUrl.trim().isEmpty()) {
            call.reject("Nedostaje slika računa.");
            return;
        }

        try {
            String base64 = dataUrl;
            int comma = dataUrl.indexOf(',');
            if (comma >= 0) base64 = dataUrl.substring(comma + 1);

            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) {
                call.reject("Slika nije čitljiva.");
                return;
            }

            InputImage image = InputImage.fromBitmap(bitmap, 0);
            TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
            recognizer.process(image)
                    .addOnSuccessListener(text -> {
                        JSObject ret = new JSObject();
                        ret.put("text", text.getText());
                        call.resolve(ret);
                    })
                    .addOnFailureListener(e -> call.reject("ML Kit OCR nije uspio: " + e.getMessage(), e));
        } catch (Exception e) {
            call.reject("Greška pri OCR obradi računa: " + e.getMessage(), e);
        }
    }
}
