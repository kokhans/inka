// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using Carcass.Core;
using Inka.Engine.Modules;
using Inka.Engine.Modules.Abstracts;
using Inka.Engine.Pipelines.Pipes;
using Inka.Engine.Pipelines.Pipes.Abstracts;
using Microsoft.Extensions.DependencyInjection;

namespace Inka.Engine.Pipelines.Blocks.Abstracts;

public abstract class PipelineBlock
{
    protected PipelineBlock(PipelineBlocksBuilder pipelineBlocksBuilder)
    {
        ArgumentVerifier.NotNull(pipelineBlocksBuilder, nameof(pipelineBlocksBuilder));

        PipelineBlocksBuilder = pipelineBlocksBuilder;
    }

    protected PipelineBlocksBuilder PipelineBlocksBuilder { get; }
    public abstract PipelineBlockType Type { get; }

    protected IPipe GetPipe(string moduleName, Action<PipeConfiguration>? configurationAction = default)
    {
        ArgumentVerifier.NotNull(moduleName, nameof(moduleName));

        ServiceProvider serviceProvider = PipelineBlocksBuilder.Services.BuildServiceProvider();
        ModuleStore moduleStore = serviceProvider.GetRequiredService<ModuleStore>();
        IModule module = moduleStore.GetModule(moduleName);

        PipeConfiguration pipeConfiguration = PipeConfiguration.New();
        configurationAction?.Invoke(pipeConfiguration);
        module.ConfigureServices(
            PipelineBlocksBuilder.Services,
            PipelineBlocksBuilder.Configuration,
            pipeConfiguration
        );

        serviceProvider = PipelineBlocksBuilder.Services.BuildServiceProvider();

        return (serviceProvider.GetRequiredService(module.PipeType) as IPipe)!;
    }
}