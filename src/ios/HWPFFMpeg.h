#import <Cordova/CDV.h>
#import <ffmpegkit/FFmpegKit.h>
#import <ffmpegkit/FFprobeKit.h>
#import <ffmpegkit/FFmpegKitConfig.h>

@interface HWPFFMpeg : CDVPlugin

- (void) exec:(CDVInvokedUrlCommand*)command;
- (void) probe:(CDVInvokedUrlCommand*)command;

@end
