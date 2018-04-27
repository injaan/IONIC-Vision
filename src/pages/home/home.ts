import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Platform } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { MobileNet } from '../../modules/mobilenet';
import { Httpd, HttpdOptions } from '@ionic-native/httpd';
import { MainProvider } from '../../providers/main/main';
import * as tf from '@tensorflow/tfjs';
import $ from 'jquery';


@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  httpdOptions: HttpdOptions = {
    www_root: 'assets', // relative path to app's www directory
    port: 8081,
    localhost_only: true
  };

  camOptions: CameraOptions = {
    quality: 100,
    destinationType: this.camera.DestinationType.DATA_URL,
    encodingType: this.camera.EncodingType.JPEG,
    mediaType: this.camera.MediaType.PICTURE,
    targetWidth:448,
    correctOrientation:false
  }

  sourceImg:HTMLImageElement;
  predictionLabels = []
  constructor(
    public navCtrl: NavController,
    private camera: Camera,
    private mobileNet:MobileNet,
    public main:MainProvider,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private httpd: Httpd
  ) {
  }

  async loadModel(){
    await this.mobileNet.loadModel();
    this.splashScreen.hide();
  }

  async ionViewDidLoad(){
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.httpd.startServer(this.httpdOptions).subscribe((data) => {
        this.sourceImg = <HTMLImageElement>document.querySelector('#sourceImg');
        this.loadModel();
      });
    });

  }



  /*
  fetchLocal(url):any {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest
      xhr.onload = function() {
        resolve(new Response(xhr.responseText, {status: xhr.status}))
      }
      xhr.onerror = function() {
        reject(new TypeError('Local request failed'))
      }
      xhr.open('GET', url)
      xhr.send(null)
    })
  }
  */
  getPhoto(){
    this.camera.getPicture(this.camOptions).then((imageData) => {
      this.sourceImg.src = null;
      this.sourceImg.src = 'data:image/jpeg;base64,' + imageData;
      setTimeout(() => {
        this.predict()
      }, 500);
    }, (err) => {
      console.log(err)
    });
  }

  predict(){
    let result = tf.tidy(() => {
      const pixels = tf.fromPixels(this.sourceImg);
      const centerHeight = pixels.shape[0] / 2;
      const beginHeight = centerHeight - (224 / 2);
      const centerWidth = pixels.shape[1] / 2;
      const beginWidth = centerWidth - (224 / 2);
      const pixelsCropped = pixels.slice([beginHeight, beginWidth, 0],[224, 224, 3]);
      return this.mobileNet.predict(pixelsCropped)
    });
    this.getLabel(result);
  }

  async getLabel(result){
    let me = this;
    let topK = await this.mobileNet.getTopKClasses(result, 10);
    this.predictionLabels = [];
    topK.forEach(function(item){
      me.predictionLabels.push(item.label+":"+item.value);
    })
  }

}
