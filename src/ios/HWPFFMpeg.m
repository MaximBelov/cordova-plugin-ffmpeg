#import "HWPFFMpeg.h"

NSString* notNull(NSString* string, NSString* valuePrefix) {
    return (string == nil) ? @"" : [NSString stringWithFormat:@"%@%@", valuePrefix, string];
}

@implementation HWPFFMpeg

NSMutableDictionary *mappings;


- (void)exec:(CDVInvokedUrlCommand*)command {

    if (mappings == nil){
        mappings = [NSMutableDictionary new];
    }

    NSString* ffmpegCommand = [[command arguments] objectAtIndex:0];
    NSLog(@"FFmpeg process started with arguments '%@'.\n", command);

    FFmpegSession* session = [FFmpegKit executeAsync:ffmpegCommand withCompleteCallback:^(FFmpegSession* session){
        SessionState state = [session getState];
        ReturnCode *returnCode = [session getReturnCode];
        long sessionId = [session getSessionId];
        NSString* responseToUser;
        NSString *output = [session getOutput];

        if ([ReturnCode isSuccess:returnCode]) {
            NSLog(@"Encode completed successfully in %ld milliseconds; playing video.\n", [session getDuration]);
            responseToUser = [NSString stringWithFormat: @"success out=%@", output];
        } else if ([ReturnCode isCancel:returnCode]) {
            NSLog(@"Encode operation cancelled\n");
            responseToUser = [NSString stringWithFormat: @"canceld"];
        } else {
            NSLog(@"Encode failed with state %@ and return code %@.%@", [FFmpegKitConfig sessionStateToString:state], returnCode, notNull([session getFailStackTrace], @"\n"));
            responseToUser = [NSString stringWithFormat: @"failure code=%@ out=%@", returnCode, output];
        }

        CDVPluginResult* result = [CDVPluginResult
                                   resultWithStatus:CDVCommandStatus_OK
                                   messageAsString:responseToUser];

        [self.commandDelegate sendPluginResult:result callbackId:[mappings valueForKey:[NSString stringWithFormat:@"%li", sessionId]]];
        [mappings removeObjectForKey:[NSString stringWithFormat:@"%li", sessionId]];

    } withLogCallback:^(Log *log) {
        NSLog(@"%@", [log getMessage]);
    } withStatisticsCallback:nil];

    long sessionId = [session getSessionId];

    NSLog(@"Async FFmpeg process started with sessionId %ld.\n", sessionId);
    [mappings setValue:command.callbackId forKey:[NSString stringWithFormat:@"%li", sessionId]];

}

- (void)probe:(CDVInvokedUrlCommand*)command {
    NSString* filePath = [[command arguments] objectAtIndex:0];
    MediaInformationSession *mediaInformationSession = [FFprobeKit getMediaInformation:filePath];
    MediaInformation *mediaInformation = [mediaInformationSession getMediaInformation];

    ReturnCode* returnCode = [mediaInformationSession getReturnCode];
    if ([ReturnCode isSuccess:returnCode]) {
        CDVPluginResult* result = [CDVPluginResult
                                   resultWithStatus:CDVCommandStatus_OK
                                   messageAsDictionary:[mediaInformation getAllProperties]];
        [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];

    } else {
        NSString* state = [FFmpegKitConfig sessionStateToString:[mediaInformationSession getState]];
        NSString* failStackTrace = notNull([mediaInformationSession getFailStackTrace], @"\n");

        NSLog(@"Command failed with state %@ and return code %@.%@", state, returnCode, failStackTrace);

        NSDictionary* dictionary = @{
            @"state" : [NSString stringWithFormat:@"%@", state],
            @"failStackTrace" : [NSString stringWithFormat:@"%@", failStackTrace],
            @"returnCode": [NSString stringWithFormat:@"%@", returnCode] ,
        };

        CDVPluginResult* result = [CDVPluginResult
                                   resultWithStatus:CDVCommandStatus_ERROR
                                   messageAsDictionary:dictionary];
        [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
    }
}

@end
