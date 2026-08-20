#import <Foundation/Foundation.h>

@interface ContourDetectorBridge : NSObject

+ (NSArray<NSDictionary *> *)extractBoxesFromFloatArray:(const float *)floatArray
                                                  count:(NSUInteger)count
                                                  width:(int)width
                                                 height:(int)height
                                              threshold:(float)threshold
                                                minArea:(float)minArea
                                               minScore:(float)minScore
                                            unclipRatio:(float)unclipRatio
                                          maxCandidates:(int)maxCandidates;

+ (NSArray<NSDictionary *> *)extractBoxesFromBase64:(NSString *)base64Data
                                              width:(int)width
                                             height:(int)height
                                          threshold:(float)threshold
                                            minArea:(float)minArea
                                           minScore:(float)minScore
                                        unclipRatio:(float)unclipRatio
                                      maxCandidates:(int)maxCandidates;

@end
