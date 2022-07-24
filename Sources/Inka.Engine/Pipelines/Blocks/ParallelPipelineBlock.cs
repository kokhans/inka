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

using System.Collections.ObjectModel;
using Carcass.Core;
using Carcass.Core.Extensions;
using Inka.Engine.Pipelines.Blocks.Abstracts;
using Inka.Engine.Pipelines.Pipes;
using Inka.Engine.Pipelines.Pipes.Abstracts;

namespace Inka.Engine.Pipelines.Blocks;

public sealed class ParallelPipelineBlock : PipelineBlock
{
    private readonly List<IPipe> _pipes;

    public ParallelPipelineBlock(PipelineBlocksBuilder pipelineBlocksBuilder) : base(pipelineBlocksBuilder)
    {
        _pipes = new List<IPipe>();
    }

    public override PipelineBlockType Type => PipelineBlockType.Parallel;
    public ReadOnlyCollection<IPipe> Pipes => _pipes.AsReadOnlyCollection();

    public ParallelPipelineBlock WithPipe(string moduleName, Action<PipeConfiguration>? configurationAction = null)
    {
        ArgumentVerifier.NotNull(moduleName, nameof(moduleName));

        _pipes.Add(GetPipe(moduleName, configurationAction));

        return this;
    }

    public PipelineBlocksBuilder Wait() => PipelineBlocksBuilder;
}