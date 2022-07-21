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

using Carcass.Cli.Logging.Spectre.Loggers;
using Carcass.Cli.Logging.Spectre.Loggers.Abstracts;
using Carcass.Core;
using Carcass.LocalStorage.Providers.Abstracts;
using Inka.Engine.Pipelines.Documents;
using Inka.Engine.VirtualObjects;

namespace Inka.Engine.Pipelines.Pipes.Abstracts;

public abstract class DocumentPipe : Pipe
{
    protected ILocalStorageProvider LocalStorageProvider { get; }
    protected List<Document> Documents { get; private set; } = new();

    protected DocumentPipe(
        ISpectreCliLogger spectreCliLogger,
        ILocalStorageProvider localStorageProvider,
        PipeConfiguration configuration
    ) : base(spectreCliLogger, configuration)
    {
        ArgumentVerifier.NotNull(localStorageProvider, nameof(localStorageProvider));

        LocalStorageProvider = localStorageProvider;
    }

    public override Task PreExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    )
    {
        base.PreExecuteAsync(spectreCliLoggerStatusContext, virtualObjectTree, pipelineContext, cancellationToken);

        Documents = DocumentCopier.CopyDocumentsFrom(
            SpectreCliLogger,
            LocalStorageProvider,
            virtualObjectTree,
            pipelineContext,
            Configuration
        );

        return Task.CompletedTask;
    }

    public override async Task PostExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    )
    {
        await base.PostExecuteAsync(spectreCliLoggerStatusContext, virtualObjectTree, pipelineContext, cancellationToken);

        await DocumentCopier.CopyDocumentsToAsync(
            SpectreCliLogger,
            LocalStorageProvider,
            virtualObjectTree,
            Documents,
            pipelineContext,
            Configuration,
            cancellationToken
        );
    }
}