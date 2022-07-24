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
using Inka.Engine.Pipelines.Blocks.Abstracts;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Inka.Engine.Pipelines.Blocks;

public sealed class PipelineBlocksBuilder
{
    private readonly List<PipelineBlock> _blocks;

    private PipelineBlocksBuilder(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentVerifier.NotNull(services, nameof(services));
        ArgumentVerifier.NotNull(configuration, nameof(configuration));

        Services = services;
        Configuration = configuration;
        _blocks = new List<PipelineBlock>();
    }

    public IServiceCollection Services { get; }
    public IConfiguration Configuration { get; }

    public SequentialPipelineBlock Sequential()
    {
        SequentialPipelineBlock sequentialBlock = new(this);
        _blocks.Add(sequentialBlock);

        return sequentialBlock;
    }

    public ParallelPipelineBlock Parallel()
    {
        ParallelPipelineBlock parallelBlock = new(this);
        _blocks.Add(parallelBlock);

        return parallelBlock;
    }

    public PipelineBlocks Build() => new(_blocks.AsReadOnly());

    public static PipelineBlocksBuilder New(
        IServiceCollection services,
        IConfiguration configuration
    ) => new(services, configuration);
}