#import "ContourDetectorBridge.h"
#import "ContourDetector.h"

@implementation ContourDetectorBridge

+ (NSArray<NSDictionary *> *)extractBoxesFromFloatArray:(const float *)floatArray
                                                  count:(NSUInteger)count
                                                  width:(int)width
                                                 height:(int)height
                                              threshold:(float)threshold
                                                minArea:(float)minArea
                                               minScore:(float)minScore
                                            unclipRatio:(float)unclipRatio
                                          maxCandidates:(int)maxCandidates {
    if (!floatArray || count < (NSUInteger)(width * height)) {
        return @[];
    }

    std::vector<DetectedBox> boxes = ExtractBoxesFromProbMap(
        floatArray,
        width,
        height,
        threshold,
        minArea,
        minScore,
        unclipRatio,
        maxCandidates
    );

    NSMutableArray<NSDictionary *> *res = [NSMutableArray arrayWithCapacity:boxes.size()];
    for (const auto &box : boxes) {
        [res addObject:@{
            @"x": @(box.x),
            @"y": @(box.y),
            @"width": @(box.width),
            @"height": @(box.height),
            @"score": @(box.score)
        }];
    }
    return res;
}

+ (NSArray<NSDictionary *> *)extractBoxesFromBase64:(NSString *)base64Data
                                              width:(int)width
                                             height:(int)height
                                          threshold:(float)threshold
                                            minArea:(float)minArea
                                           minScore:(float)minScore
                                        unclipRatio:(float)unclipRatio
                                      maxCandidates:(int)maxCandidates {
    if (!base64Data || base64Data.length == 0) {
        return @[];
    }

    NSData *data = [[NSData alloc] initWithBase64EncodedString:base64Data options:0];
    if (!data || data.length < (NSUInteger)(width * height * sizeof(float))) {
        return @[];
    }

    const float *floatArray = (const float *)data.bytes;
    return [self extractBoxesFromFloatArray:floatArray
                                      count:data.length / sizeof(float)
                                      width:width
                                     height:height
                                  threshold:threshold
                                    minArea:minArea
                                   minScore:minScore
                                unclipRatio:unclipRatio
                              maxCandidates:maxCandidates];
}

@end
