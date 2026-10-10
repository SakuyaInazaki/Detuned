# NC03 v2 夹具纠正

C首统一专项保留NC03在仓库root裸import包的ERR_MODULE_NOT_FOUND；root未依赖client，正式MCP调用已通过，非Node export产品缺陷。父授权唯一变更：child cwd改正式依赖client的packages/mcp。保bare @detuned/client/node、browser不暴露resolver及所有原断言/10秒child预算。

原v1 manifest不覆盖；v2仅该test hash改变，diff在nc03-fixture-v2.diff。未改产品/依赖、未build/运行测试；C单case复验。现再次停写。
