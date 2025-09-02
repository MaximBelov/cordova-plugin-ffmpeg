import { Component, Injector, ChangeDetectorRef, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LoadingController, Platform, AlertController } from '@ionic/angular';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { WebView } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { Camera, CameraOptions, PictureSourceType, MediaType } from '@awesome-cordova-plugins/camera/ngx';
import { Chooser } from '@awesome-cordova-plugins/chooser/ngx';
import { FFMpeg, VideoInformation } from '@awesome-cordova-plugins/ffmpeg/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  public encodedSrc: SafeResourceUrl | String = '';
  public showVideoPreview = false;
  public videoInformation: VideoInformation;
  public filesDirectory: string;
  public tempDirectory: string;
  private readonly videoMimeTypes = ['video/mp4', 'video/quicktime'];

  private readonly file = inject(File);
  private readonly chooser = inject(Chooser);
  private readonly ffMpeg = inject(FFMpeg);
  private readonly loadingController = inject(LoadingController);
  private readonly alertController = inject(AlertController);
  private readonly platform = inject(Platform);
  private readonly webview = inject(WebView);
  private readonly camera = inject(Camera);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  constructor() {
    this.platform
      .ready()
      .then(() => {
        if (this.platform.is('cordova')) {
          this.filesDirectory = this.file.dataDirectory + 'files/';
          this.tempDirectory = this.platform.is('ios') ? this.file.tempDirectory : this.file.cacheDirectory;
        }
      })
      .catch((error) => {
        throw error;
      });
  }

  async chooserAndProbe() {
    const videoFileEntry = await this.getVideoFile(10000000 * 10, this.videoMimeTypes);
    if (!videoFileEntry) {
      return;
    }
    const { inputFilePath } = videoFileEntry;

    try {
      this.videoInformation = await this.ffMpeg.probe(inputFilePath);
    } catch (error) {
      console.error(error);
    }
  }

  async chooserAndExec() {
    const videoFileEntry = await this.getVideoFile(10000000 * 10, this.videoMimeTypes);
    if (!videoFileEntry) {
      return;
    }
    const { inputFilePath, outputFilePath } = videoFileEntry;
    await this.encodeAndUpdatePreview(inputFilePath, outputFilePath);
  }

  async cameraAndProbe() {
    const videoFileEntry = await this.getVideoFromCamera();
    if (!videoFileEntry) {
      return;
    }
    try {
      this.videoInformation = await this.ffMpeg.probe(videoFileEntry.inputFilePath);
    } catch (error) {
      console.error(error);
    }
  }

  async cameraAndExec() {
    const videoFileEntry = await this.getVideoFromCamera();
    if (!videoFileEntry) {
      return;
    }
    const { inputFilePath, outputFilePath } = videoFileEntry
    await this.encodeAndUpdatePreview(inputFilePath, outputFilePath);
  }

  private async encodeAndUpdatePreview(inputFilePath, outputFilePath,) {
    const loader = await this.loadingController.create({ id: 'ffmpeg' });
    await loader.present();
    await this.encodeVideo(inputFilePath, outputFilePath)
    await this.loadingController.dismiss(null, null, 'ffmpeg');
    this.showVideoPreview = false;
    this.encodedSrc = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.webview.convertFileSrc(outputFilePath)
    )
    this.changeDetectorRef.detectChanges();
    this.showVideoPreview = true;
  }

  private async getVideoFromCamera() {
    const options: CameraOptions = {
      sourceType: PictureSourceType.PHOTOLIBRARY,
      saveToPhotoAlbum: false,
      mediaType: MediaType.VIDEO,

    };
    const videoPath = (await this.camera.getPicture(options)) as string;
    let currentName: string;
    if (this.platform.is('android')) {
      const originalName = videoPath.substring(videoPath.lastIndexOf('/') + 1, videoPath.lastIndexOf('?'));
      const newName = `${new Date().getTime()}.${originalName.split('.')[1]}`;
      await this.file.moveFile(this.tempDirectory, originalName, this.tempDirectory, newName);
      currentName = newName;
    } else {
      currentName = videoPath.substr(videoPath.lastIndexOf('/') + 1);
    }
    return {
      inputFilePath: `${this.tempDirectory}${currentName}`,
      outputFilePath: `${this.tempDirectory}${new Date().getTime()}.mp4`
    };
  }

  private async getVideoFile(maxFileSize: number, mimeTypes: string[]): Promise<{
    inputFilePath: string,
    outputFilePath: string
  }> {
    try {
      const fileEntry = await this.chooser.getFile({ mimeTypes: mimeTypes.join(','), maxFileSize });
      if (!fileEntry) {
        return;
      }
      const { path, name } = fileEntry;
      const outputFileName = `${name}_${new Date().getTime()}.mp4`;
      return {
        inputFilePath: path,
        outputFilePath: `${this.tempDirectory}${outputFileName}`
      }

    } catch (e) {
      console.error(e);
      const alert = await this.alertController.create({
        header: 'Alert',
        subHeader: '',
        message: e === 'Invalid size' ? e : 'Error while reading file',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  // https://superuser.com/questions/1155186/convert-mov-video-to-mp4-with-ffmpeg
  private async encodeVideo(inputFilePath: string, outputFilePath: string) {
    try {
      const command = [
        `-i ${inputFilePath}`,
        '-vcodec libx264',
        '-preset veryfast',
        '-vf scale=w=1280:h=1280:force_original_aspect_ratio=decrease',
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-ss 00:00',
        '-to 00:30',
        '-movflags +faststart',
        outputFilePath,
      ].join(' ');
      await this.ffMpeg.exec(command);
    } catch (error) {
      console.log(error);
    }
  }
}
