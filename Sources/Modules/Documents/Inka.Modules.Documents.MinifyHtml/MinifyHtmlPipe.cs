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

using AngleSharp;
using AngleSharp.Html.Dom;
using AngleSharp.Html.Parser;
using Carcass.Cli.Logging.Spectre.Loggers;
using Carcass.Cli.Logging.Spectre.Loggers.Abstracts;
using Carcass.Core;
using Carcass.LocalStorage.Providers.Abstracts;
using Inka.Engine.Pipelines;
using Inka.Engine.Pipelines.Documents;
using Inka.Engine.Pipelines.Pipes;
using Inka.Engine.Pipelines.Pipes.Abstracts;
using Inka.Engine.VirtualObjects;

namespace Inka.Modules.Documents.MinifyHtml;

public interface IMinifyHtmlPipe : IPipe
{
}

public sealed class MinifyHtmlPipe : DocumentPipe, IMinifyHtmlPipe
{
    public MinifyHtmlPipe(
        ISpectreCliLogger spectreCliLogger,
        ILocalStorageProvider localStorageProvider,
        PipeConfiguration configuration,
        string name
    ) : base(spectreCliLogger, localStorageProvider, configuration)
    {
        ArgumentVerifier.NotNull(name, nameof(name));

        Name = name;
    }

    public override string Name { get; }

    public override async Task ExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    )
    {
        await base.ExecuteAsync(spectreCliLoggerStatusContext, virtualObjectTree, pipelineContext, cancellationToken);

        spectreCliLoggerStatusContext.SetStatus($"{Name} pipe executing...");

        foreach (Document document in Documents)
        {
            VirtualFile virtualFile = (VirtualFile) virtualObjectTree
                .Flatten()
                .Single(vo => vo.Id == document.VirtualObjectId);

            SpectreCliLogger.LogInformation("Execute minify HTML on document {0} starting...",
                virtualFile.FullPath
            );

            HtmlParser htmlParser = new();
            using IHtmlDocument htmlDocument = await htmlParser.ParseDocumentAsync(
                document.Content!,
                cancellationToken
            );
            document.Content = htmlDocument.Minify();

            SpectreCliLogger.LogInformation("Execute minify HTML on Document {0} finished.",
                virtualFile.FullPath
            );
        }
    }
}